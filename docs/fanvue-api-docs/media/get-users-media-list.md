# Get user's media list

GET https://api.fanvue.com/media

Returns a paginated list of media items for the authenticated user.

    For media with status other than FINALISED, only uuid and status are returned.
    For FINALISED media, all details including variants are included.

    <Info>Scope required: `read:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/media/get-user-media

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get user's media list
  version: endpoint_.getUserMedia
paths:
  /media:
    get:
      operationId: get-user-media
      summary: Get user's media list
      description: |-
        Returns a paginated list of media items for the authenticated user.

            For media with status other than FINALISED, only uuid and status are returned.
            For FINALISED media, all details including variants are included.

            <Info>Scope required: `read:media`</Info>
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
        - name: mediaType
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/MediaGetParametersMediaType'
        - name: folderName
          in: query
          required: false
          schema:
            type: string
        - name: usage
          in: query
          required: false
          schema:
            $ref: '#/components/schemas/MediaGetParametersUsage'
        - name: purchasedBy
          in: query
          description: >-
            UUID of the user to check media purchases against. When provided,
            each media item will include a purchasedByFan boolean indicating if
            that user has purchased it.
          required: false
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          required: false
          schema:
            type: array
            items:
              $ref: '#/components/schemas/MediaStatus'
        - name: variants
          in: query
          required: false
          schema:
            type: array
            items:
              $ref: '#/components/schemas/MediaVariantType'
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
          description: List of user media
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getUserMedia_Response_200'
        '400':
          description: Bad Request - API version not supported OR validation failed
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
    MediaGetParametersMediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    MediaGetParametersUsage:
      type: string
      enum:
        - value: subscribers
        - value: followers
        - value: ppv
        - value: mass_messages
    MediaStatus:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    MediaVariantType:
      type: string
      enum:
        - value: blurred
        - value: main
        - value: thumbnail
        - value: thumbnail_gallery
    MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf0Status:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    MediaGetResponsesContentApplicationJsonSchemaDataItems0:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        status:
          $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf0Status
      required:
        - uuid
        - status
    MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1Status:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1MediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1VariantsItemsVariantType:
      type: string
      enum:
        - value: blurred
        - value: main
        - value: thumbnail
        - value: thumbnail_gallery
    MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1VariantsItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        variantType:
          $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1VariantsItemsVariantType
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
        - uuid
        - variantType
        - displayPosition
        - width
        - height
        - lengthMs
    MediaGetResponsesContentApplicationJsonSchemaDataItems1:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        status:
          $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1Status
        createdAt:
          type: string
          format: date
        url:
          type: string
        caption:
          type:
            - string
            - 'null'
        description:
          type:
            - string
            - 'null'
        name:
          type:
            - string
            - 'null'
        mediaType:
          $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1MediaType
        recommendedPrice:
          type:
            - number
            - 'null'
          format: double
        variants:
          type: array
          items:
            $ref: >-
              #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItemsOneOf1VariantsItems
        purchasedByFan:
          type: boolean
      required:
        - uuid
        - status
        - createdAt
        - caption
        - description
        - name
        - mediaType
        - recommendedPrice
    MediaGetResponsesContentApplicationJsonSchemaDataItems:
      oneOf:
        - $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItems0
        - $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItems1
    MediaGetResponsesContentApplicationJsonSchemaPagination:
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
    getUserMedia_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of media items
        pagination:
          $ref: >-
            #/components/schemas/MediaGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/media"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/media'
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

	url := "https://api.fanvue.com/media"

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

url = URI("https://api.fanvue.com/media")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/media")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/media', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/media");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/media")! as URL,
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
