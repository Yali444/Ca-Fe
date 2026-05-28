// Generate a simple blur placeholder
export const generateBlurPlaceholder = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Create a gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL()
}

// Predefined blur data for common image sizes
export const blurPlaceholders = {
  small: "data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' fill='%23f3f4f6'/%3E%3C/svg%3E",
  medium: "data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3C/svg%3E",
  large: "data:image/svg+xml,%3Csvg width='160' height='160' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='160' height='160' fill='%23f3f4f6'/%3E%3C/svg%3E",
}

// Get appropriate blur placeholder based on image size
export const getBlurPlaceholder = (imagePath: string) => {
  // Return different placeholders based on image type or size
  if (imagePath.includes('hero') || imagePath.includes('large')) {
    return blurPlaceholders.large
  }
  return blurPlaceholders.medium
}
