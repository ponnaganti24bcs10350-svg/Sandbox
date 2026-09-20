# Posts API

## GET /api/posts

Returns a paginated list of published posts.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---:|---|
| page | number | 1 | Page number |
| limit | number | 20 | Number of posts per page |

### Example

GET /api/posts?page=1&limit=20

### Response

```json
{
  "data": [
    {
      "id": "post-id",
      "title": "Example title",
      "content": "Example content",
      "tags": ["backend"],
      "createdAt": "2026-08-01T10:00:00.000Z",
      "author": {
        "id": "user-id",
        "name": "Example User",
        "avatar": "/avatars/example.png"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}