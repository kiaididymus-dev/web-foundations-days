# Library API Design: Books

Base URL: `/api`
Resource: `books`
Book object: `{ "id": 1, "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958 }`

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Request body:**
```json
  { "title": "Weep Not, Child", "author": "Ngugi wa Thiong'o", "year": 1964 }
```
- **Success status:** 201 Created

### 4. Update a book
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Request body:**
```json
  { "title": "Weep Not, Child", "author": "Ngugi wa Thiong'o", "year": 1964 }
```
- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by author
- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the author in the query parameter.
- **Request body:** none
- **Success status:** 200 OK

## Error codes

- **400 Bad Request**
  - Meaning: the request is invalid or incomplete.
  - Example: `POST /books` with a body that has no `title`, or a `year` that is not a number.
- **404 Not Found**
  - Meaning: the requested resource does not exist.
  - Example: `GET /books/999` when no book has the id 999.