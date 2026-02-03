# Get list of posts

GET https://api.fanvue.com/posts

Returns a paginated list of posts created by the authenticated user. Posts are ordered by pinned status first, then by publication date (newest first).

    <Info>Scope required: `read:post`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/posts/get-posts

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get list of posts
  version: endpoint_.getPosts
paths:
  /posts:
    get:
      operationId: get-posts
      summary: Get list of posts
      description: >-
        Returns a paginated list of posts created by the authenticated user.
        Posts are ordered by pinned status first, then by publication date
        (newest first).

            <Info>Scope required: `read:post`</Info>
      tags:
        - []
      parameters:
        - name: page
          in: query
          description: Page number to retrieve (starts from 1)
          required: false
          schema:
            type: number
            format: double
            default: 1
        - name: size
          in: query
          description: 'Number of items to return per page (1-50, default: 15)'
          required: false
          schema:
            type: number
            format: double
            default: 15
        - name: Authorization
          in: header
          description: >-
            Bearer authentication of the form `Bearer <token>`, where token is
            your auth token.
          required: true
          schema:
            type: string
        - name: X-Fanvue-API-Version
          in: header
          description: API version to use for the request
          required: true
          schema:
            type: string
            default: '2025-06-26'
      responses:
        '200':
          description: List of posts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getPosts_Response_200'
        '400':
          description: Request validation failed
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    PostAudience:
      type: string
      enum:
        - value: subscribers
        - value: followers-and-subscribers
    PostsGetResponsesContentApplicationJsonSchemaDataItemsTips:
      type: object
      properties:
        count:
          type: number
          format: double
          description: Number of paid tips received on this post
        totalGross:
          type: number
          format: double
          description: Total gross amount of paid tips in cents
        totalNet:
          type: number
          format: double
          description: Total net amount of paid tips in cents (after platform fees)
      required:
        - count
        - totalGross
        - totalNet
    PostsGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
          description: Unique identifier of the post
        createdAt:
          type: string
          format: date-time
          description: Date/time when the post was created (ISO 8601 format)
        text:
          type:
            - string
            - 'null'
          description: Text content of the post
        price:
          type:
            - number
            - 'null'
          format: double
          description: Price in cents for paid posts
        audience:
          $ref: '#/components/schemas/PostAudience'
        publishAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Future date/time when the post will be published (ISO 8601 format)
        publishedAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date/time when the post was published (ISO 8601 format)
        expiresAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date/time when the post expires (ISO 8601 format)
        mediaUuids:
          type: array
          items:
            type: string
            format: uuid
          description: Array of media UUIDs attached to the post
        isPinned:
          type: boolean
          description: Whether the post is pinned to the top of the feed
        likesCount:
          type: number
          format: double
          description: Number of likes the post has received
        commentsCount:
          type: number
          format: double
          description: Number of comments on the post
        tips:
          $ref: >-
            #/components/schemas/PostsGetResponsesContentApplicationJsonSchemaDataItemsTips
          description: Tips statistics for this post
      required:
        - uuid
        - createdAt
        - text
        - price
        - audience
        - publishAt
        - publishedAt
        - expiresAt
        - mediaUuids
        - isPinned
        - likesCount
        - commentsCount
        - tips
    PostsGetResponsesContentApplicationJsonSchemaPagination:
      type: object
      properties:
        page:
          type: number
          format: double
          description: Current page number
        size:
          type: number
          format: double
          description: Number of records returned in this response
        hasMore:
          type: boolean
          description: Whether there are more items available on subsequent pages
      required:
        - page
        - size
        - hasMore
    getPosts_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/PostsGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of posts
        pagination:
          $ref: >-
            #/components/schemas/PostsGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/posts"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/posts'
const options = {
  method: 'GET',
  headers: { 'X-Fanvue-API-Version': '2025-06-26', Authorization: 'Bearer <token>' },
}

try {
  const response = await fetch(url, options)
  const data = await response.json()
  console.log(data)
} catch (error) {
  console.error(error)
}
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.fanvue.com/posts"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("X-Fanvue-API-Version", "2025-06-26")
	req.Header.Add("Authorization", "Bearer <token>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.fanvue.com/posts")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/posts")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/posts', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/posts");
var request = new RestRequest(Method.GET);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>"
]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/posts")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```
