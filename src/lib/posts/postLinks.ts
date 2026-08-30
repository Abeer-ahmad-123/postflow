import type { Post } from '@/payload-types'

type PostLinkTarget = Pick<Post, 'id' | 'topicName'> & Partial<Pick<Post, 'slug'>>

export function slugifyPostName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'post'
}

export function postRouteSegment(post: PostLinkTarget) {
  return post.slug || slugifyPostName(post.topicName) || String(post.id)
}

export function postPath(post: PostLinkTarget) {
  return `/posts/${postRouteSegment(post)}`
}

export function editPostPath(post: PostLinkTarget) {
  return `${postPath(post)}/edit`
}
