# Library API Design

A REST API for a library's **books** resource. Base path: `/books`. All requests and responses use JSON.

A book looks like this:

```json
{ "id": 7, "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958, "available": true }
```

## Endpoints

### 1. List all books
- **Method and path:** `GET /books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book
- **Method and path:** `GET /books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book
- **Method and path:** `POST /books`
- **Description:** Adds a new book; the server assigns the id.
- **Example request body:**
  ```json
  { "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958 }
  ```
- **Success status:** `201 Created`

### 4. Replace a book
- **Method and path:** `PUT /books/{id}`
- **Description:** Replaces all the fields of an existing book.
- **Example request body:**
  ```json
  { "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958, "available": false }
  ```
- **Success status:** `200 OK`

### 5. Update part of a book
- **Method and path:** `PATCH /books/{id}`
- **Description:** Changes only the fields that are sent, such as availability.
- **Example request body:**
  ```json
  { "available": false }
  ```
- **Success status:** `200 OK`

### 6. Delete a book
- **Method and path:** `DELETE /books/{id}`
- **Description:** Removes the book from the library.
- **Request body:** none
- **Success status:** `204 No Content`

### 7. List books by an author
- **Method and path:** `GET /books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the author given in the query parameter.
- **Request body:** none
- **Success status:** `200 OK`

## Error codes

### 400 Bad Request
- The request is invalid, so the server cannot process it.
- **Example:** `POST /books` with a body that has no `title`, or with `"year": "abc"` instead of a number.

### 404 Not Found
- The resource does not exist.
- **Example:** `GET /books/9999` when no book has the id 9999, or `DELETE /books/9999` for a book that was already deleted.