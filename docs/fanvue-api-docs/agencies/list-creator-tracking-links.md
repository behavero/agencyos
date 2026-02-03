# List creator's tracking links

GET https://api.fanvue.com/creators/{creatorUserUuid}/tracking-links

List tracking links for the specified creator with cursor-based pagination.

<Info>Scope required: `read:tracking_links` `read:creator`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/list-creator-tracking-links

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List creator's tracking links
  version: endpoint_.listCreatorTrackingLinks
paths:
  /creators/{creatorUserUuid}/tracking-links:
    get:
      operationId: list-creator-tracking-links
      summary: List creator's tracking links
      description: >-
        List tracking links for the specified creator with cursor-based
        pagination.


        <Info>Scope required: `read:tracking_links` `read:creator`</Info>
      tags:
        - []
      parameters:
        - name: creatorUserUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: limit
          in: query
          description: Number of results to return (default 20)
          required: false
          schema:
            type: integer
        - name: cursor
          in: query
          description: Cursor for pagination
          required: false
          schema:
            type: string
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
          description: List of tracking links
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/listCreatorTrackingLinks_Response_200'
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
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    CreatorsCreatorUserUuidTrackingLinksGetResponsesContentApplicationJsonSchemaDataItemsExternalSocialPlatform:
      type: string
      enum:
        - value: facebook
        - value: instagram
        - value: other
        - value: reddit
        - value: snapchat
        - value: tiktok
        - value: twitter
        - value: youtube
    CreatorsCreatorUserUuidTrackingLinksGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
          description: Tracking link UUID
        name:
          type: string
          description: Name of the tracking link
        linkUrl:
          type: string
          description: Tracking link URL (e.g., 'fv-123')
        externalSocialPlatform:
          $ref: >-
            #/components/schemas/CreatorsCreatorUserUuidTrackingLinksGetResponsesContentApplicationJsonSchemaDataItemsExternalSocialPlatform
          description: Social platform
        createdAt:
          type: string
          format: date-time
          description: When the link was created
        clicks:
          type: number
          format: double
          description: Number of clicks on this link
      required:
        - uuid
        - name
        - linkUrl
        - externalSocialPlatform
        - createdAt
        - clicks
    listCreatorTrackingLinks_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidTrackingLinksGetResponsesContentApplicationJsonSchemaDataItems
        nextCursor:
          type:
            - string
            - 'null'
          description: Cursor for next page
      required:
        - data
        - nextCursor
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/tracking-links"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/tracking-links'
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

	url := "https://api.fanvue.com/creators/creatorUserUuid/tracking-links"

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/tracking-links")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/creators/creatorUserUuid/tracking-links")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/creators/creatorUserUuid/tracking-links', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/tracking-links");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/tracking-links")! as URL,
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
