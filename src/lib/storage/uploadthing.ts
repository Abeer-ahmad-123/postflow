export function isUploadThingStorageConfigured() {
  return Boolean(process.env.UPLOADTHING_TOKEN)
}

export function assertImageStorageAvailableOnVercel() {
  if (process.env.VERCEL && !isUploadThingStorageConfigured()) {
    throw new Error(
      'Image storage is not configured. Add UPLOADTHING_TOKEN to the Vercel project environment variables, then redeploy.',
    )
  }
}
