# Get media from a creator's chat

GET https://api.fanvue.com/creators/{creatorUserUuid}/chats/{userUuid}/media

Returns a cursor-paginated list of media items shared between the specified creator and user. Media is extracted from chat messages and ordered by date (newest first).

**Pagination Flow:**

- First request: Omit the `cursor` parameter, returns first 20 media items (or specified limit)
- Subsequent requests: Use the `nextCursor` from the previous response
- End of results: `nextCursor` will be `null`

```json
{
  "data": [...media items...],
  "nextCursor": "..." // Pass this to the next request to get the following page
}
```

<Info>Scopes required: `read:creator`, `read:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/list-creator-chat-media

## OpenAPI Specification

````yaml
openapi: 3.1.1
info:
  title: Get media from a creator's chat
  version: endpoint_.listCreatorChatMedia
paths:
  /creators/{creatorUserUuid}/chats/{userUuid}/media:
    get:
      operationId: list-creator-chat-media
      summary: Get media from a creator's chat
      description: >-
        Returns a cursor-paginated list of media items shared between the
        specified creator and user. Media is extracted from chat messages and
        ordered by date (newest first).


        **Pagination Flow:**

        - First request: Omit the `cursor` parameter, returns first 20 media
        items (or specified limit)

        - Subsequent requests: Use the `nextCursor` from the previous response

        - End of results: `nextCursor` will be `null`


        ```json

        {
          "data": [...media items...],
          "nextCursor": "..." // Pass this to the next request to get the following page
        }

        ```


        <Info>Scopes required: `read:creator`, `read:chat`</Info>
      tags:
        - []
      parameters:
        - name: creatorUserUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: userUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: cursor
          in: query
          description: Cursor for fetching the next page of media
          required: false
          schema:
            type: string
        - name: mediaType
          in: query
          description: Filter by media type (image, video, audio, document)
          required: false
          schema:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidChatsUserUuidMediaGetParametersMediaType
        - name: limit
          in: query
          description: 'Number of media items to return (1-50, default: 20)'
          required: false
          schema:
            type: number
            format: double
            default: 20
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
          description: Cursor-paginated list of media items
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/listCreatorChatMedia_Response_200'
        '400':
          description: >-
            Bad Request - API version not supported OR validation failed OR
            invalid UUID
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '404':
          description: No conversation found with the given user
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    CreatorsCreatorUserUuidChatsUserUuidMediaGetParametersMediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsMediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
        - value: unknown
    CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsVariantsItemsVariantType:
      type: string
      enum:
        - value: main
        - value: thumbnail
        - value: thumbnail_gallery
        - value: blurred
    CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsVariantsItems:
      type: object
      properties:
        variantType:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsVariantsItemsVariantType
        displayPosition:
          type: number
          format: double
        url:
          type: string
        width:
          type:
            - number
            - 'null'
          format: double
        height:
          type:
            - number
            - 'null'
          format: double
        lengthMs:
          type:
            - number
            - 'null'
          format: double
      required:
        - variantType
        - displayPosition
        - width
        - height
        - lengthMs
    CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        messageUuid:
          type: string
          format: uuid
        mediaType:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsMediaType
        created_at:
          type: string
          format: date
        sentAt:
          type: string
          format: date
        ownerUuid:
          type: string
          format: uuid
        name:
          type:
            - string
            - 'null'
        variants:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItemsVariantsItems
      required:
        - uuid
        - messageUuid
        - mediaType
        - created_at
        - sentAt
        - ownerUuid
        - name
    listCreatorChatMedia_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidChatsUserUuidMediaGetResponsesContentApplicationJsonSchemaDataItems
        nextCursor:
          type:
            - string
            - 'null'
          description: Cursor for fetching the next page, null if no more results
      required:
        - data
        - nextCursor
````

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media'
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

	url := "https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media"

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/chats/userUuid/media")! as URL,
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
