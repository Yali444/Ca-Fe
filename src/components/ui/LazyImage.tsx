"use client"

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { getBlurPlaceholder } from '@/lib/image-utils'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  sizes?: string
  priority?: boolean
  quality?: number
  onLoad?: () => void
  onError?: () => void
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes,
  priority = false,
  quality = 75,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Start loading 50px before image comes into view
      }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [priority])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${fill ? 'absolute inset-0' : ''} ${className}`}
        style={!fill ? { width, height } : {}}
      >
        <span className="text-gray-500 dark:text-gray-400 text-sm">
          תמונה לא זמינה
        </span>
      </div>
    )
  }

  return (
    <div 
      ref={imgRef} 
      className={`relative ${fill ? 'absolute inset-0' : ''} ${className}`}
      style={!fill ? { width, height } : {}}
    >
      {isInView && (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={`object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          sizes={sizes}
          priority={priority}
          quality={quality}
          onLoad={handleLoad}
          onError={handleError}
          blurDataURL={getBlurPlaceholder(src)}
          placeholder="blur"
        />
      )}
      
      {/* Loading placeholder */}
      {!isLoaded && (
        <div 
          className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-300`}
        />
      )}
    </div>
  )
}
