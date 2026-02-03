# Get creator's media by UUID

GET https://api.fanvue.com/creators/{creatorUserUuid}/media/{uuid}

Returns a specific media item by its UUID for the specified creator.

    For media with status other than FINALISED, only uuid and status are returned.
    For FINALISED media, all details including variants are included.

    <Warning>Media URLs are only available through variants.
    Specify the `variants` query parameter (e.g., `?variants=main,thumbnail,blurred`)
    to include them in the response. Without this parameter, the `variants` field
    will be an empty array and no media URLs will be returned.</Warning>

    <Info>Scopes required: `read:creator`, `read:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/get-creator-media-by-uuid

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get creator's media by UUID
  version: endpoint_.getCreatorMediaByUuid
paths:
  /creators/{creatorUserUuid}/media/{uuid}:
    get:
      operationId: get-creator-media-by-uuid
      summary: Get creator's media by UUID
      description: |-
        Returns a specific media item by its UUID for the specified creator.

            For media with status other than FINALISED, only uuid and status are returned.
            For FINALISED media, all details including variants are included.

            <Warning>Media URLs are only available through variants.
            Specify the `variants` query parameter (e.g., `?variants=main,thumbnail,blurred`)
            to include them in the response. Without this parameter, the `variants` field
            will be an empty array and no media URLs will be returned.</Warning>

            <Info>Scopes required: `read:creator`, `read:media`</Info>
      tags:
        - []
      parameters:
        - name: creatorUserUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: uuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: purchasedBy
          in: query
          description: >-
            UUID of the user to check media purchase against. When provided, the
            media item will include a purchasedByFan boolean indicating if that
            user has purchased it.
          required: false
          schema:
            type: string
            format: uuid
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
          description: Media item
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getCreatorMediaByUuid_Response_200'
        '400':
          description: Bad Request - API version not supported OR validation failed
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '404':
          description: Not Found Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    MediaVariantType:
      type: string
      enum:
        - value: blurred
        - value: main
        - value: thumbnail
        - value: thumbnail_gallery
    CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf0Status:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    GetCreatorMediaByUuidResponse2000:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        status:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf0Status
      required:
        - uuid
        - status
    CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1Status:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1MediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1VariantsItemsVariantType:
      type: string
      enum:
        - value: blurred
        - value: main
        - value: thumbnail
        - value: thumbnail_gallery
    CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1VariantsItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        variantType:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1VariantsItemsVariantType
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
    GetCreatorMediaByUuidResponse2001:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        status:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1Status
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
            #/components/schemas/CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1MediaType
        recommendedPrice:
          type:
            - number
            - 'null'
          format: double
        variants:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidMediaUuidGetResponsesContentApplicationJsonSchemaOneOf1VariantsItems
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
    getCreatorMediaByUuid_Response_200:
      oneOf:
        - $ref: '#/components/schemas/GetCreatorMediaByUuidResponse2000'
        - $ref: '#/components/schemas/GetCreatorMediaByUuidResponse2001'
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/media/uuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/media/uuid'
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

	url := "https://api.fanvue.com/creators/creatorUserUuid/media/uuid"

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/media/uuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/creators/creatorUserUuid/media/uuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/creators/creatorUserUuid/media/uuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/media/uuid");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/media/uuid")! as URL,
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
