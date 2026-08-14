import { motion } from 'motion/react'

export default function RoutePlaceholder({ title, description, path }) {
  return (
    <main className="route-placeholder">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <p className="route-placeholder__path">{path}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <a href="/" className="mt-4 inline-block">&larr; Back to home</a>
      </motion.section>
    </main>
  )
}