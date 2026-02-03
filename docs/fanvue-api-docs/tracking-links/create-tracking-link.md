# Create a tracking link

POST https://api.fanvue.com/tracking-links
Content-Type: application/json

Create a new tracking link for the authenticated user.

<Info>Scope required: `write:tracking_links`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/tracking-links/create-tracking-link

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create a tracking link
  version: endpoint_.createTrackingLink
paths:
  /tracking-links:
    post:
      operationId: create-tracking-link
      summary: Create a tracking link
      description: |-
        Create a new tracking link for the authenticated user.

        <Info>Scope required: `write:tracking_links`</Info>
      tags:
        - []
      parameters:
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
        '201':
          description: Tracking link created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/createTrackingLink_Response_201'
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: Name of the tracking link
                externalSocialPlatform:
                  $ref: >-
                    #/components/schemas/TrackingLinksPostRequestBodyContentApplicationJsonSchemaExternalSocialPlatform
                  description: Social platform
              required:
                - name
                - externalSocialPlatform
components:
  schemas:
    TrackingLinksPostRequestBodyContentApplicationJsonSchemaExternalSocialPlatform:
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
    TrackingLinksPostResponsesContentApplicationJsonSchemaExternalSocialPlatform:
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
    createTrackingLink_Response_201:
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
            #/components/schemas/TrackingLinksPostResponsesContentApplicationJsonSchemaExternalSocialPlatform
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
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/tracking-links"

payload = {
    "name": "string",
    "externalSocialPlatform": "facebook"
}
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/tracking-links'
const options = {
  method: 'POST',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{"name":"string","externalSocialPlatform":"facebook"}',
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
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.fanvue.com/tracking-links"

	payload := strings.NewReader("{\n  \"name\": \"string\",\n  \"externalSocialPlatform\": \"facebook\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("X-Fanvue-API-Version", "2025-06-26")
	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

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

url = URI("https://api.fanvue.com/tracking-links")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"name\": \"string\",\n  \"externalSocialPlatform\": \"facebook\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.fanvue.com/tracking-links")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"name\": \"string\",\n  \"externalSocialPlatform\": \"facebook\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.fanvue.com/tracking-links', [
  'body' => '{
  "name": "string",
  "externalSocialPlatform": "facebook"
}',
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'Content-Type' => 'application/json',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/tracking-links");
var request = new RestRequest(Method.POST);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"name\": \"string\",\n  \"externalSocialPlatform\": \"facebook\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = [
  "name": "string",
  "externalSocialPlatform": "facebook"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/tracking-links")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

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
