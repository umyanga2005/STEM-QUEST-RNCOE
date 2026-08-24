/**
 * Admin Question Builder — question media service (Task 5.12).
 *
 * The trusted boundary for the private `question-media` bucket. Uploads run
 * through the backend service role (never the browser), every object is
 * validated (size/MIME/content) and stored at a server-generated path, and
 * every ref returned matches the media schema pattern. signed URLs are only
 * ever handed to authenticated admins for preview.
 *
 * Ownership & lifecycle (no schema redesign, no media table):
 *   - Paths carry a sanitized admin-identity owner segment, so the service can
 *     prove who uploaded an object and block deletion across admin accounts.
 *   - Deletion is additionally gated on `isMediaRefInUse`: an object is only
 *     removed when NO question (draft, published or archived) still references
 *     it. This is the non-destructive cleanup guarantee — deleting/replacing
 *     an image in one draft can never destroy another question's media.
 *   - Removing a question never cascades to storage; orphaned objects are
 *     cleaned explicitly through this surface. Documented limitation (D-084).
 */

import { randomUUID } from 'node:crypto'
import { questionError } from '../errors.js'
import {
  isSafeMediaRef,
  sanitizeMediaSegment,
  validateQuestionMediaFile,
  buildQuestionMediaPath,
} from '../security/media.js'

/**
 * @param {object} deps
 * @param {object} deps.mediaRepository - QuestionMediaRepository contract
 * @param {object} deps.questionRepository - QuestionRepository contract
 *   (needs `isMediaRefInUse`)
 */
export class QuestionMediaService {
  constructor({ mediaRepository, questionRepository }) {
    this.mediaRepository = mediaRepository
    this.questionRepository = questionRepository
  }

  /** Validates + stores an image; returns the safe storage ref. */
  async upload({ admin, file }) {
    const result = validateQuestionMediaFile(file)
    if (!result.ok) {
      throw questionError.mediaValidation([{ path: '/file', code: result.code, message: result.reason }])
    }
    const path = buildQuestionMediaPath(admin.id, randomUUID(), result.extension)
    await this.mediaRepository.upload({ path, buffer: file.buffer, mimeType: result.mimeType })
    return { media: { ref: path } }
  }

  /** Short-lived signed URL for an authenticated admin preview. */
  async url({ ref }) {
    if (!isSafeMediaRef(ref)) {
      throw questionError.mediaValidation([{ path: '/ref', code: 'REF', message: 'The image path is not valid.' }])
    }
    const url = await this.mediaRepository.signedUrl(ref)
    if (!url) throw questionError.mediaNotFound(`ref ${ref}`)
    return { url }
  }

  /**
   * Removes an object the requesting admin owns, only when no question still
   * references it. Never deletes another account's media.
   */
  async remove({ admin, ref }) {
    if (!isSafeMediaRef(ref)) {
      throw questionError.mediaValidation([{ path: '/ref', code: 'REF', message: 'The image path is not valid.' }])
    }
    const owner = sanitizeMediaSegment(ref.split('/')[1])
    if (!owner || owner !== sanitizeMediaSegment(admin.id)) {
      throw questionError.mediaForbidden(`ref ${ref}`)
    }
    if (await this.questionRepository.isMediaRefInUse(ref)) {
      throw questionError.mediaInUse(`ref ${ref}`)
    }
    const removed = await this.mediaRepository.remove(ref)
    if (!removed) throw questionError.mediaNotFound(`ref ${ref}`)
    return { removed: true }
  }
}

export default { QuestionMediaService }