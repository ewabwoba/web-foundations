# SnapShare: Photo-Sharing App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following assumptions are used:

- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each thumbnail size: 50 KB.
- A day has 86,400 seconds and a year has 365 days.
- Peak traffic is estimated at 5 times the average traffic.
- Each uploaded photo produces one thumbnail.
- Storage estimates exclude database overhead, backups, replication, and additional application data.
- Feed views represent requests for feed pages, not individual photos displayed on each page.

## 2. Traffic and Storage Calculations

### Daily Active Users

Daily active users are 10% of registered users.

DAU = 10,000,000 × 10%

**Daily active users = 1,000,000**

### Uploads per Second

Each active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos

Average uploads per second = 1,000,000 ÷ 86,400

**Average uploads per second ≈ 11.57**

Peak uploads per second = 11.57 × 5

**Peak uploads per second ≈ 57.87**

### Feed Views per Second

Each active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = 50,000,000 feed pages

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed views per second ≈ 578.70**

Peak feed views per second = 578.70 × 5

**Peak feed views per second ≈ 2,893.52**

### Photo Storage per Year

Original photo storage per day:

1,000,000 × 2 MB = 2,000,000 MB = 2 TB per day

Original photo storage per year:

2 TB × 365 = **730 TB per year**

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB = approximately 50 GB per day.

Thumbnail storage per year:

50 GB × 365 = **18.25 TB per year**

Total new photo storage per year:

730 TB + 18.25 TB = **748.25 TB per year**

Therefore, SnapShare needs approximately 748.25 TB of additional storage per year for original photos and thumbnails, using decimal storage units. This excludes backups, replicas, and storage overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view approximately 50 million feed pages daily, compared with one million photo uploads daily. That is approximately 50 feed-page views for every upload.

The architecture should therefore optimize feed delivery using a CDN, caching, and database read replicas. Uploads should be handled separately from thumbnail processing so that generating thumbnails does not slow down the upload response.

## 4. Why Photos Should Not Be Stored in the Database

Original photos and thumbnails should be stored in object storage rather than directly inside the relational database. Photo files are large binary objects, and storing them in the database can increase database size, backups, and query overhead. Object storage is designed for durable, scalable file storage, while the database should hold metadata such as photo ID, owner ID, caption, upload time, and object-storage key.

## 5. Architecture Diagram

                         +---------+
                         |  Users  |
                         +----+----+
                              |
              +---------------+----------------+
              | (photos/thumbnails)            | (API requests)
              v                                v
        +-----------+                  +---------------+
        |    CDN    |                  | Load Balancer |
        +-----+-----+                  +-------+-------+
              | cache miss                     |
              v                        +-------+-------+
      +----------------+               |               |
      | Object Storage |        +------v-----+  +------v-----+
      | (originals +   |        | App Server |  | App Server | ...
      |  thumbnails)   |        +--+---+---+-+  +-+---+---+--+
      +----^-----^-----+           |   |   |      |   |   |
           |     |                 |   |   +------+   |   |
           |     |                 |   |       |      |   |
           |     |         read/   |   |  +----v------v+  |
           |     |         write   |   |  |   Cache    |  |
           |     |          cache  |   |  |  (Redis)   |  |
           |     |                 |   |  +------------+  |
           |     |                 |   |                  |
           |     |       writes    |   | reads (cache     | enqueue
           |     |                 v   v  miss)           | job
           |     |         +----------+  +--------------+  |
           |     |         | Database |  |   Database   |  |
           |     |         | (Primary)|->|Read Replica  |  |
           |     |         +----------+  +--------------+  |
           |     |          replication                    v
           |     |                                  +-----------+
           |     |                                  |   Queue   |
           |     |                                  +-----+-----+
           |     |                                        |
           |     |                                        v
           |     |   read original               +------------------+
           |     +-------------------------------+ Thumbnail Worker |
           |         write thumbnail             +------------------+
           +-------------------------------------------+

## 6. Components and the Problems They Solve

1.CDN: Caches photos and thumbnails at locations near users so images load quickly and most image traffic never reaches our servers.
2.Load balancer: Spreads incoming requests across many app servers so no single server is overloaded and a failed server can be skipped.
3.App servers: Run the application logic (auth, upload, feed building) and are stateless, so we can add more as traffic grows.
4.Cache: Keeps frequently read data (feeds, profiles, photo metadata) in memory so repeated reads are fast and the database is protected.
5.Database (primary): Durably stores structured data (users, follows, photo metadata) and handles all writes.
6.Read replica: A copy of the primary that serves read queries, spreading the heavy read load and providing a backup if the primary fails.
7.Object storage: Cheaply and durably stores huge numbers of large photo files that would not fit well in a database.
8.Queue: Holds thumbnail jobs so uploads return quickly and work is not lost if workers are busy or down.
9.Thumbnail worker: Picks jobs from the queue and creates the 50 KB thumbnail in the background, so the user does not wait for image processing.

## 7. Photo Upload Flow

1. A user selects a photo and submits it through the application.
2. The app server authenticates the user and validates the file type, size, and upload permissions.
3. The application stores the original photo in object storage, ideally using a unique object key.
4. The app server saves the photo metadata and object key in the primary database.
5. The application places a thumbnail-generation job on the queue.
6. The server returns an upload success response once the original file and required metadata have been stored and the job has been accepted.
7. A thumbnail worker retrieves the job from the queue and downloads or reads the original photo.
8. The worker generates a 50 KB thumbnail and stores it in object storage.
9. The worker updates the photo metadata or processing status to indicate that the thumbnail is ready.
10. When users view the feed, the app retrieves feed metadata from the cache or database and serves images through the CDN.

If thumbnail processing fails, the queue can retry the job. The application should also expose a pending or failed thumbnail state so that users do not receive broken image links.

## 8. Trade-Offs

### Trade-Off 1: Caching vs. Data Freshness

Caching feed data reduces database load and improves response times. However, cached feeds may briefly show outdated information after a user uploads a photo or follows someone. Cache invalidation and expiration policies help balance performance and freshness.

### Trade-Off 2: Asynchronous Processing vs. Immediate Availability

Using a queue allows uploads to finish without waiting for thumbnail generation, improving responsiveness. However, thumbnails may not be available immediately. The application must handle pending processing states and retry failed jobs.

### Trade-Off 3: Read Replicas vs. Consistency

Read replicas reduce pressure on the primary database and improve read scalability. However, replication lag can cause users to see slightly outdated feed metadata. Critical writes and reads that require immediate consistency may need to use the primary database.

### Trade-Off 4: Object Storage vs. Simplicity

Object storage scales well for large image collections and separates file delivery from database queries. However, it introduces additional components, permissions, object-key management, and coordination between file storage and database records.

## 9. Conclusion

SnapShare has one million daily active users, approximately 11.57 average photo uploads per second, and approximately 578.70 average feed-page views per second. It generates about 748.25 TB of new original-photo and thumbnail data per year. A read-optimized architecture using a CDN, cache, read replica, object storage, and asynchronous thumbnail workers provides a foundation for scaling as usage grows.