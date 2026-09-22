'use client'

import { ImageIcon, Loader2, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  ChangeEvent,
  FormEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'

import { updatePostFormAction } from '@/app/(frontend)/(app)/posts/actions'
import { usePostTextState } from '@/components/posts/post-text-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initialActionState, type ActionState } from '@/lib/forms/actionState'
import {
  MAX_POST_IMAGES,
  MAX_POST_IMAGE_SIZE,
  POST_IMAGE_ACCEPT,
} from '@/lib/posts/postImageConfig'
import { deleteUploadedMedia, uploadPostImagesToBlob } from '@/lib/posts/postImageUploads.client'
import { relationshipID } from '@/lib/utils'
import type { Media, Post } from '@/payload-types'

type PostFormProps =
  | {
      mode: 'create'
      post?: never
      useBlobUploads: boolean
    }
  | {
      mode: 'edit'
      post: Post
      useBlobUploads: boolean
    }

export function PostForm(props: PostFormProps) {
  if (props.mode === 'create') {
    return <CreatePostForm useBlobUploads={props.useBlobUploads} />
  }

  return <EditPostForm post={props.post} useBlobUploads={props.useBlobUploads} />
}

function CreatePostForm({ useBlobUploads }: { useBlobUploads: boolean }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)

    const formData = new FormData(event.currentTarget)
    type CreatePostResult = { href?: string; id?: string; message?: string; ok?: boolean }
    let result: CreatePostResult | null = null
    let response: Response
    let uploadedMediaIds: number[] = []

    try {
      if (useBlobUploads) {
        const files = formData
          .getAll('images')
          .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0)
        const media = await uploadPostImagesToBlob(files)

        uploadedMediaIds = media.map((item) => item.id)
        formData.delete('images')
        formData.set('newImageIds', JSON.stringify(uploadedMediaIds))
      }

      response = await fetch('/api/posts', {
        body: formData,
        method: 'POST',
      })
      result = (await response.json().catch(() => null)) as CreatePostResult | null
    } catch (caughtError) {
      await deleteUploadedMedia(uploadedMediaIds)
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create topic. Please try again.'
      setPending(false)
      setError(message)
      toast.error(message)
      return
    }

    if (!response.ok || !result?.ok || !result.id) {
      const message = result?.message || 'Unable to create topic. Please try again.'
      await deleteUploadedMedia(uploadedMediaIds)
      setPending(false)
      setError(message)
      toast.error(message)
      return
    }

    toast.success(result.message || 'Topic created.')
    router.replace(result.href || `/posts/${result.id}`)
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <PostFormFields />
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <Button disabled={pending} type="submit">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Create Topic
      </Button>
    </form>
  )
}

function EditPostForm({ post, useBlobUploads }: { post: Post; useBlobUploads: boolean }) {
  const router = useRouter()
  const toastKey = useRef('')
  const submittedPostText = useRef('')
  const uploadedMediaIds = useRef<number[]>([])
  const [preparingImages, setPreparingImages] = useState(false)
  const [clientError, setClientError] = useState('')
  const [, startTransition] = useTransition()
  const { setCurrentPostText, setSavedPostText } = usePostTextState(post.postText)
  const action = updatePostFormAction.bind(null, String(post.id))
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    initialActionState,
  )

  useEffect(() => {
    if (!state.message) {
      return
    }

    if (state.ok) {
      uploadedMediaIds.current = []
    } else if (uploadedMediaIds.current.length > 0) {
      void deleteUploadedMedia(uploadedMediaIds.current)
      uploadedMediaIds.current = []
    }

    const nextToastKey = `${state.ok}:${state.message}:${state.id || ''}`

    if (toastKey.current === nextToastKey) {
      return
    }

    toastKey.current = nextToastKey

    if (state.ok) {
      setCurrentPostText?.(submittedPostText.current)
      setSavedPostText?.(submittedPostText.current)

      toast.success(state.message)
      if (state.href) {
        router.replace(state.href)
      }
    } else {
      toast.error(state.message)
    }
  }, [router, setCurrentPostText, setSavedPostText, state])

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault()
        setClientError('')
        setPreparingImages(true)

        const formData = new FormData(event.currentTarget)
        submittedPostText.current = String(formData.get('postText') || '')
        uploadedMediaIds.current = []

        try {
          if (useBlobUploads) {
            const files = formData
              .getAll('images')
              .filter((entry): entry is File => typeof entry !== 'string' && entry.size > 0)
            const media = await uploadPostImagesToBlob(files)

            uploadedMediaIds.current = media.map((item) => item.id)
            formData.delete('images')
            formData.set('newImageIds', JSON.stringify(uploadedMediaIds.current))
          }

          startTransition(() => formAction(formData))
        } catch (caughtError) {
          await deleteUploadedMedia(uploadedMediaIds.current)
          uploadedMediaIds.current = []
          const message =
            caughtError instanceof Error
              ? caughtError.message
              : 'Unable to upload images. Please try again.'

          setClientError(message)
          toast.error(message)
        } finally {
          setPreparingImages(false)
        }
      }}
    >
      <PostFormFields onPostTextChange={setCurrentPostText} post={post} />
      {state.message && !state.ok ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      {clientError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{clientError}</p>
      ) : null}
      <Button disabled={pending || preparingImages} type="submit">
        {pending || preparingImages ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </Button>
    </form>
  )
}

function PostFormFields({
  onPostTextChange,
  post,
}: {
  onPostTextChange?: (postText: string) => void
  post?: Post
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="topicName">Topic Name</Label>
        <Input
          defaultValue={post?.topicName}
          id="topicName"
          maxLength={180}
          name="topicName"
          placeholder="Next.js 16 Features"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="topicLink">Topic Link</Label>
        <Input
          defaultValue={post?.topicLink}
          id="topicLink"
          name="topicLink"
          placeholder="https://example.com/article"
          required
          type="url"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="postText">Post Text</Label>
        <Textarea
          defaultValue={post?.postText || ''}
          id="postText"
          name="postText"
          onChange={(event) => onPostTextChange?.(event.target.value)}
          placeholder="Draft content can be added now or later."
        />
        <p className="text-xs text-slate-500">
          Optional for open and declined topics. Required before review, ready, or posted.
        </p>
      </div>
      <PostImageField images={post?.images} />
    </>
  )
}

type SelectedImage = {
  file: File
  id: string
  previewUrl: string
}

function PostImageField({ images = [] }: { images?: Post['images'] }) {
  const existingImages = (images || [])
    .map((image) => {
      const id = relationshipID(image)

      return id === undefined
        ? null
        : { id: String(id), media: typeof image === 'object' ? image : undefined }
    })
    .filter((image): image is { id: string; media: Media | undefined } => Boolean(image))
  const [retainedImageIds, setRetainedImageIds] = useState(existingImages.map((image) => image.id))
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const availableSlots = MAX_POST_IMAGES - retainedImageIds.length - selectedImages.length

  useEffect(() => {
    const input = inputRef.current

    if (!input || typeof DataTransfer === 'undefined') {
      return
    }

    const transfer = new DataTransfer()
    selectedImages.forEach(({ file }) => transfer.items.add(file))
    input.files = transfer.files
  }, [selectedImages])

  function onImagesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter((file) => {
      if (!POST_IMAGE_ACCEPT.split(',').includes(file.type)) {
        setError('Images must be JPEG, PNG, WebP, or GIF files.')
        return false
      }

      if (file.size > MAX_POST_IMAGE_SIZE) {
        setError('Each image must be 10 MB or smaller.')
        return false
      }

      return true
    })
    const filesToAdd = validFiles.slice(0, availableSlots)

    if (validFiles.length > availableSlots) {
      setError(`You can upload up to ${MAX_POST_IMAGES} images.`)
    } else if (validFiles.length === files.length) {
      setError('')
    }

    setSelectedImages((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        file,
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        previewUrl: URL.createObjectURL(file),
      })),
    ])
  }

  function removeSelectedImage(id: string) {
    setSelectedImages((current) => {
      const removed = current.find((image) => image.id === id)

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }

      return current.filter((image) => image.id !== id)
    })
    setError('')
  }

  const visibleExistingImages = existingImages.filter((image) =>
    retainedImageIds.includes(image.id),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="images">Images</Label>
        <span className="text-xs text-slate-500">
          {retainedImageIds.length + selectedImages.length}/{MAX_POST_IMAGES}
        </span>
      </div>
      <input name="retainedImageIds" type="hidden" value={JSON.stringify(retainedImageIds)} />
      {visibleExistingImages.length > 0 || selectedImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleExistingImages.map(({ id, media }) => (
            <ImagePreview
              alt={media?.alt || media?.filename || 'Post image'}
              key={id}
              label={media?.filename || 'Existing image'}
              onRemove={() =>
                setRetainedImageIds((current) => current.filter((value) => value !== id))
              }
              src={media?.url}
            />
          ))}
          {selectedImages.map((image) => (
            <ImagePreview
              alt={image.file.name}
              key={image.id}
              label={image.file.name}
              onRemove={() => removeSelectedImage(image.id)}
              src={image.previewUrl}
            />
          ))}
        </div>
      ) : null}
      <Input
        accept={POST_IMAGE_ACCEPT}
        className="h-auto cursor-pointer py-2 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
        disabled={availableSlots === 0}
        id="images"
        multiple
        name="images"
        onChange={onImagesSelected}
        ref={inputRef}
        type="file"
      />
      <p className="text-xs text-slate-500">
        Optional. Add up to 3 JPEG, PNG, WebP, or GIF images (10 MB each).
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}

function ImagePreview({
  alt,
  label,
  onRemove,
  src,
}: {
  alt: string
  label: string
  onRemove: () => void
  src?: null | string
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      <div className="aspect-video">
        {src ? (
          // The direct media URL preserves the authenticated browser request.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={alt} className="h-full w-full object-cover" src={src} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
      </div>
      <p className="truncate border-t border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
        {label}
      </p>
      <button
        aria-label={`Remove ${label}`}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-white transition hover:bg-slate-950"
        onClick={onRemove}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
