# Detailed Backend Schema Document
# Production-Grade Real-Time Messaging Platform

---

# 1. Document Purpose

This document defines the complete backend data architecture and database schema design for the Real-Time Messaging Platform.

The goal of this schema architecture is to:
- Support scalable real-time messaging
- Maintain efficient database queries
- Enable future scalability
- Reduce query complexity
- Improve backend maintainability
- Support advanced chat features
- Ensure production-grade performance

This document covers:
- MongoDB collections
- Mongoose schema structures
- Relationships
- Indexing strategies
- Query optimization
- Validation rules
- Data flow considerations
- Scalability planning

---

# 2. Database Architecture Overview

---

# 2.1 Database Choice

## Selected Database
### MongoDB

---

# Why MongoDB?

MongoDB is ideal for real-time chat systems because:

### Flexible Document Structure
Chat applications evolve rapidly.
MongoDB supports schema flexibility.

### High Write Throughput
Messaging systems are write-heavy.
MongoDB handles frequent writes efficiently.

### Fast Reads
Optimized indexes enable fast conversation retrieval.

### Horizontal Scalability
MongoDB supports sharding for future scaling.

### JSON-Like Documents
Works naturally with JavaScript/Node.js ecosystems.

---

# 2.2 Core Collections

The backend will contain the following primary collections:

1. users
2. chats
3. messages
4. notifications
5. socketSessions (optional future scaling)

---

# 3. Users Collection Schema

---

# 3.1 Purpose

The users collection stores:
- Authentication data
- User profile information
- Presence metadata
- Account settings

---

# 3.2 User Schema Structure

## Collection Name
users

---

## Schema Fields

### _id
Type:
ObjectId

Purpose:
Unique user identifier.

---

### username
Type:
String

Requirements:
- Required
- Unique
- Trimmed
- Min length: 3
- Max length: 30

Index:
YES

Purpose:
Used for:
- Search
- Display
- Mentions

---

### email
Type:
String

Requirements:
- Required
- Unique
- Lowercase
- Valid email format

Index:
YES

Purpose:
Authentication identifier.

---

### password
Type:
String

Requirements:
- Required
- bcrypt hashed
- Never returned in API responses

Purpose:
Secure authentication.

---

### avatar
Type:
String

Purpose:
Stores Cloudinary image URL.

Default:
Generated placeholder avatar.

---

### bio
Type:
String

Requirements:
- Optional
- Max length: 250

Purpose:
Profile description.

---

### isOnline
Type:
Boolean

Default:
false

Purpose:
Real-time presence tracking.

---

### lastSeen
Type:
Date

Purpose:
Track user activity timestamp.

---

### socketId
Type:
String

Purpose:
Maps active socket connection.

Important:
May later move to Redis.

---

### profileVisibility
Type:
String

Enum:
- public
- private

Default:
public

Purpose:
Privacy control.

---

### accountStatus
Type:
String

Enum:
- active
- suspended
- deleted

Default:
active

Purpose:
Moderation control.

---

### createdAt
Type:
Date

Auto-generated.

---

### updatedAt
Type:
Date

Auto-generated.

---

# 3.3 User Schema Indexing Strategy

## Primary Indexes

### email Index
Purpose:
Fast login lookup.

---

### username Index
Purpose:
Fast search queries.

---

### isOnline Index
Purpose:
Presence queries.

---

# 3.4 User Schema Example

{
  _id: ObjectId,
  username: "rudraksh",
  email: "rud@example.com",
  password: "hashed_password",
  avatar: "https://cloudinary-url",
  bio: "Full-stack developer",
  isOnline: true,
  lastSeen: ISODate,
  socketId: "socket123",
  profileVisibility: "public",
  accountStatus: "active",
  createdAt: ISODate,
  updatedAt: ISODate
}

---

# 4. Chats Collection Schema

---

# 4.1 Purpose

The chats collection stores:
- One-to-one conversations
- Group conversations
- Conversation metadata
- Latest message references

---

# 4.2 Chat Schema Structure

## Collection Name
chats

---

## Schema Fields

### _id
Type:
ObjectId

Purpose:
Unique chat identifier.

---

### chatName
Type:
String

Purpose:
Group name OR generated private chat name.

---

### isGroupChat
Type:
Boolean

Default:
false

Purpose:
Distinguish:
- Private chats
- Group chats

---

### users
Type:
Array<ObjectId>

Reference:
users collection

Requirements:
- Required
- Minimum 2 users

Purpose:
Participants in conversation.

---

### groupAdmin
Type:
ObjectId

Reference:
users collection

Purpose:
Stores group admin.

Only used when:
isGroupChat = true

---

### groupAvatar
Type:
String

Purpose:
Stores group image.

---

### latestMessage
Type:
ObjectId

Reference:
messages collection

Purpose:
Fast sidebar rendering.

Critical Optimization:
Avoids querying latest message repeatedly.

---

### unreadCounts
Type:
Map

Structure:
userId → unread count

Purpose:
Track unread messages per user.

---

### mutedUsers
Type:
Array<ObjectId>

Purpose:
Notification preferences.

---

### archivedBy
Type:
Array<ObjectId>

Purpose:
Chat archive functionality.

---

### deletedFor
Type:
Array<ObjectId>

Purpose:
Soft delete chats for specific users.

---

### createdAt
Type:
Date

---

### updatedAt
Type:
Date

---

# 4.3 Chat Schema Indexing Strategy

## users Index
Purpose:
Fast conversation lookup.

---

## updatedAt Index
Purpose:
Fast latest-chat sorting.

---

## isGroupChat Index
Purpose:
Filter chat types.

---

# 4.4 Chat Schema Example

{
  _id: ObjectId,
  chatName: "Developers Group",
  isGroupChat: true,
  users: [ObjectId, ObjectId],
  groupAdmin: ObjectId,
  groupAvatar: "https://cloudinary-url",
  latestMessage: ObjectId,
  unreadCounts: {
    user1: 2,
    user2: 0
  },
  mutedUsers: [ObjectId],
  archivedBy: [],
  deletedFor: [],
  createdAt: ISODate,
  updatedAt: ISODate
}

---

# 5. Messages Collection Schema

---

# 5.1 Purpose

The messages collection stores:
- Text messages
- Media messages
- Message metadata
- Delivery states
- Read receipts

---

# 5.2 Message Schema Structure

## Collection Name
messages

---

## Schema Fields

### _id
Type:
ObjectId

Purpose:
Unique message identifier.

---

### sender
Type:
ObjectId

Reference:
users collection

Purpose:
Message author.

---

### chat
Type:
ObjectId

Reference:
chats collection

Purpose:
Conversation reference.

---

### content
Type:
String

Requirements:
- Optional for media-only messages
- Max length validation

Purpose:
Stores text content.

---

### messageType
Type:
String

Enum:
- text
- image
- file
- audio
- video
- system

Default:
text

Purpose:
Render-specific UI behavior.

---

### mediaUrl
Type:
String

Purpose:
Cloudinary media URL.

---

### mediaMetadata
Type:
Object

Purpose:
Stores:
- file size
- dimensions
- duration
- MIME type

---

### readBy
Type:
Array<ObjectId>

Purpose:
Read receipt tracking.

---

### deliveredTo
Type:
Array<ObjectId>

Purpose:
Delivery tracking.

---

### reactions
Type:
Array<Object>

Structure:
{
  user: ObjectId,
  emoji: String
}

Purpose:
Emoji reactions.

---

### edited
Type:
Boolean

Default:
false

Purpose:
Message edit tracking.

---

### editedAt
Type:
Date

Purpose:
Stores edit timestamp.

---

### deletedForEveryone
Type:
Boolean

Default:
false

Purpose:
Global deletion state.

---

### deletedFor
Type:
Array<ObjectId>

Purpose:
Soft delete for specific users.

---

### replyTo
Type:
ObjectId

Reference:
messages collection

Purpose:
Reply threading.

---

### createdAt
Type:
Date

---

### updatedAt
Type:
Date

---

# 5.3 Message Schema Indexing Strategy

## chat Index
Purpose:
Fast message retrieval.

Critical for:
Chat opening performance.

---

## createdAt Index
Purpose:
Efficient chronological sorting.

---

## sender Index
Purpose:
Analytics and filtering.

---

# 5.4 Message Schema Example

{
  _id: ObjectId,
  sender: ObjectId,
  chat: ObjectId,
  content: "Hello world",
  messageType: "text",
  mediaUrl: null,
  mediaMetadata: {},
  readBy: [ObjectId],
  deliveredTo: [ObjectId],
  reactions: [
    {
      user: ObjectId,
      emoji: "🔥"
    }
  ],
  edited: false,
  deletedForEveryone: false,
  deletedFor: [],
  replyTo: null,
  createdAt: ISODate,
  updatedAt: ISODate
}

---

# 6. Notifications Collection Schema

---

# 6.1 Purpose

The notifications collection stores:
- Message notifications
- Mention notifications
- Group activity notifications

---

# 6.2 Notification Schema Structure

## Collection Name
notifications

---

## Schema Fields

### recipient
Type:
ObjectId

Reference:
users collection

---

### sender
Type:
ObjectId

Reference:
users collection

---

### type
Type:
String

Enum:
- message
- mention
- group
- system

---

### chat
Type:
ObjectId

Reference:
chats collection

---

### message
Type:
ObjectId

Reference:
messages collection

---

### isRead
Type:
Boolean

Default:
false

---

### createdAt
Type:
Date

---

# 6.3 Notification Indexing Strategy

## recipient Index
Purpose:
Fast notification lookup.

---

## isRead Index
Purpose:
Unread notification queries.

---

# 7. Optional Socket Session Schema

---

# 7.1 Purpose

Used in future distributed scaling architecture.

Stores:
- Active socket sessions
- Multi-device sessions
- Redis synchronization references

---

# 7.2 Socket Session Schema

## Collection Name
socketSessions

---

## Fields

### user
Type:
ObjectId

---

### socketId
Type:
String

---

### deviceInfo
Type:
Object

---

### ipAddress
Type:
String

---

### connectedAt
Type:
Date

---

# 8. Relationships Between Collections

---

# 8.1 User ↔ Chat Relationship

Relationship Type:
Many-to-Many

Reason:
- Users can belong to many chats
- Chats contain many users

Implemented Using:
users[] array in chats

---

# 8.2 Chat ↔ Message Relationship

Relationship Type:
One-to-Many

Reason:
- One chat contains many messages

Implemented Using:
chat field in messages

---

# 8.3 User ↔ Message Relationship

Relationship Type:
One-to-Many

Reason:
- One user sends many messages

Implemented Using:
sender field in messages

---

# 9. Schema Validation Strategy

---

# 9.1 Backend Validation Layers

Validation occurs at:

1. Request layer
2. Service layer
3. Database schema layer

---

# 9.2 Mongoose Validation

Examples:
- Required fields
- Enum validation
- Length validation
- Default values

---

# 9.3 API Validation

Libraries:
- Joi
OR
- Zod

Purpose:
Prevent invalid payloads before DB interaction.

---

# 10. Pagination Strategy

---

# 10.1 Message Pagination

Required Because:
Chats may contain thousands of messages.

---

# Strategy

Use:
- limit
- skip
OR
- cursor pagination

Recommended:
Cursor pagination for scalability.

---

# 10.2 Chat Pagination

Purpose:
Efficient sidebar loading.

---

# 11. Query Optimization Strategy

---

# 11.1 Avoid Overpopulation

Problem:
Heavy populate queries reduce performance.

Solution:
Selective field population.

---

# 11.2 Lean Queries

Use:
.lean()

Purpose:
Reduce Mongoose overhead.

---

# 11.3 latestMessage Optimization

Why Important:
Avoid querying latest message repeatedly.

Solution:
Store latestMessage reference inside chats.

---

# 12. Soft Delete Strategy

---

# Why Soft Deletes?

Reasons:
- Better UX
- Recoverability
- Audit support

---

# Implementation

Use:
- deletedFor
- deletedForEveryone
- accountStatus

Instead of hard deletion.

---

# 13. Real-Time Data Considerations

---

# 13.1 Presence Data

Current Storage:
MongoDB fields.

Future Optimization:
Redis-based ephemeral presence storage.

---

# 13.2 Socket Mapping

Current:
socketId inside users.

Future:
Dedicated Redis socket mapping.

---

# 14. Security Considerations

---

# 14.1 Sensitive Fields

Never Return:
- password
- internal tokens

Use:
select: false

---

# 14.2 File Security

Validate:
- MIME types
- Upload size
- File extensions

---

# 14.3 Rate Limiting

Protect:
- Auth routes
- Message spam
- Upload abuse

---

# 15. Scalability Planning

---

# 15.1 Current Scale

Optimized For:
- Thousands of users
- Moderate concurrent messaging

---

# 15.2 Future Scale Upgrades

Potential Additions:
- Redis caching
- Message queues
- Sharding
- Microservices
- Kafka event streaming

---

# 16. Production Engineering Best Practices

---

# 16.1 Timestamp Usage

Always use:
createdAt
updatedAt

Purpose:
- Sorting
- Analytics
- Auditing

---

# 16.2 Consistent Naming

Use:
camelCase

Across:
- APIs
- Schemas
- Services
- Frontend

---

# 16.3 Avoid Massive Documents

Never store:
All messages inside chat document.

Reason:
MongoDB document size limitations.

Correct Approach:
Separate messages collection.

---

# 17. Backend Data Flow Example

---

# Message Creation Flow

User Sends Message
↓
API Request Arrives
↓
Validation Middleware
↓
Controller
↓
Message Service
↓
Create Message Document
↓
Update Chat.latestMessage
↓
Save To MongoDB
↓
Emit Socket Event
↓
Frontend Receives Update

---

# 18. Final Backend Schema Vision

This backend schema architecture is designed to emulate the engineering structure of modern large-scale messaging platforms.

The schema design prioritizes:
- Scalability
- Query performance
- Maintainability
- Real-time efficiency
- Future extensibility
- Production reliability

The architecture is intentionally modular and extensible so the platform can evolve from:

Simple Chat App
→ Production Messaging Platform
→ Multi-Server Real-Time System
→ Distributed Communication Infrastructure

The final system architecture should be capable of supporting:
- High message throughput
- Real-time synchronization
- Large user bases
- Future advanced communication features
- Enterprise-grade scaling improvements

