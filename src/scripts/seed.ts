import 'dotenv/config'

import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import { changePostStatus, createTopic } from '@/lib/workflow/changePostStatus'

const password = 'Postflow123!'

const seedUsers = [
  { email: 'user.a@example.com', name: 'User A' },
  { email: 'user.b@example.com', name: 'User B' },
  { email: 'user.c@example.com', name: 'User C' },
  { email: 'user.d@example.com', name: 'User D' },
]

const seedTopicNames = [
  'Seed: Open Content Idea',
  'Seed: Review Draft',
  'Seed: Proof Read Draft',
  'Seed: Posted Announcement',
  'Seed: Declined Source',
]

async function upsertUser(payload: Awaited<ReturnType<typeof getPayload>>, user: (typeof seedUsers)[number]) {
  const existing = await payload.find({
    collection: 'users',
    limit: 1,
    where: {
      email: {
        equals: user.email,
      },
    },
  })

  if (existing.docs[0]) {
    return payload.update({
      collection: 'users',
      data: {
        name: user.name,
        password,
      },
      id: existing.docs[0].id,
    })
  }

  return payload.create({
    collection: 'users',
    data: {
      email: user.email,
      name: user.name,
      password,
    },
  })
}

async function removeExistingSeedPosts(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({
    collection: 'posts',
    depth: 0,
    limit: 100,
    where: {
      topicName: {
        in: seedTopicNames,
      },
    },
  })

  const ids = existing.docs.map((post) => post.id)

  if (ids.length === 0) {
    return
  }

  await payload.delete({
    collection: 'post-actions',
    where: {
      post: {
        in: ids,
      },
    },
  })

  await payload.delete({
    collection: 'posts',
    where: {
      id: {
        in: ids,
      },
    },
  })
}

async function main() {
  const payload = await getPayload({ config })
  const users = await Promise.all(seedUsers.map((user) => upsertUser(payload, user)))
  const [userA, userB, userC, userD] = users as User[]

  await removeExistingSeedPosts(payload)

  await createTopic({
    input: {
      postText: '',
      topicLink: 'https://example.com/open-topic',
      topicName: seedTopicNames[0],
    },
    payload,
    user: userA,
  })

  const review = await createTopic({
    input: {
      postText: 'A draft that is ready for review.',
      topicLink: 'https://example.com/review-topic',
      topicName: seedTopicNames[1],
    },
    payload,
    user: userA,
  })
  await changePostStatus({
    comment: 'Ready for review.',
    newStatus: 'review',
    payload,
    postId: review.id,
    user: userB,
  })

  const proofRead = await createTopic({
    input: {
      postText: 'A reviewed draft that needs final proofing.',
      topicLink: 'https://example.com/proof-topic',
      topicName: seedTopicNames[2],
    },
    payload,
    user: userA,
  })
  await changePostStatus({ newStatus: 'review', payload, postId: proofRead.id, user: userB })
  await changePostStatus({ newStatus: 'proof_read', payload, postId: proofRead.id, user: userC })

  const posted = await createTopic({
    input: {
      postText: 'A polished post that has been published.',
      topicLink: 'https://example.com/posted-topic',
      topicName: seedTopicNames[3],
    },
    payload,
    user: userA,
  })
  await changePostStatus({ newStatus: 'review', payload, postId: posted.id, user: userB })
  await changePostStatus({ newStatus: 'proof_read', payload, postId: posted.id, user: userC })
  await changePostStatus({
    comment: 'Published on the main channel.',
    newStatus: 'posted',
    payload,
    postId: posted.id,
    user: userD,
  })

  const declined = await createTopic({
    input: {
      postText: '',
      topicLink: 'https://example.com/declined-topic',
      topicName: seedTopicNames[4],
    },
    payload,
    user: userA,
  })
  await changePostStatus({
    comment: 'Source is not useful for this workflow.',
    newStatus: 'declined',
    payload,
    postId: declined.id,
    user: userB,
  })

  payload.logger.info(`Seed complete. Password for all seed users: ${password}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
