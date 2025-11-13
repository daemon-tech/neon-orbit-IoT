/**
 * DRAGGABLE HOOK
 * Makes any element draggable with position persistence
 */

import { useState, useRef, useEffect } from 'react'

interface Position {
  x: number
  y: number
}

export const useDraggable = (initialPosition?: Position) => {
  const [position, setPosition] = useState<Position>(
    initialPosition || { x: 0, y: 0 }
  )
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position>({ x: 0, y: 0 })
  const elementRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (elementRef.current) {
      setIsDragging(true)
      const rect = elementRef.current.getBoundingClientRect()
      dragStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return
      
      const rect = elementRef.current.getBoundingClientRect()
      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y
      
      // Boundary constraints - keep within viewport
      const minX = 0
      const maxX = window.innerWidth - rect.width
      const minY = 0
      const maxY = window.innerHeight - rect.height
      
      setPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return {
    position,
    isDragging,
    elementRef,
    handleMouseDown,
  }
}

