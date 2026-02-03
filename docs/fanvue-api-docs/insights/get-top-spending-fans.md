# Get top-spending fans

GET https://api.fanvue.com/insights/top-spenders

Returns a paginated list of the top-spending fans for the authenticated creator with their spending totals and message counts.

<Info>Scopes required: `read:insights`, `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/insights/get-top-spenders

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get top-spending fans
  version: endpoint_.getTopSpenders
paths:
  /insights/top-spenders:
    get:
      operationId: get-top-spenders
      summary: Get top-spending fans
      description: >-
        Returns a paginated list of the top-spending fans for the authenticated
        creator with their spending totals and message counts.


        <Info>Scopes required: `read:insights`, `read:fan`</Info>
      tags:
        - []
      parameters:
        - name: startDate
          in: query
          description: >-
            Start date as ISO 8601 datetime string with optional timezone offset
            (e.g., 2024-10-20T00:00:00+01:00 or 2024-10-20T00:00:00Z).
          required: false
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          description: >-
            End date as ISO 8601 datetime string with optional timezone offset
            (e.g., 2024-10-25T00:00:00+01:00 or 2024-10-25T00:00:00Z).
            Non-inclusive - data before this date is included.
          required: false
          schema:
            type: string
            format: date-time
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
          description: Top spending fans with pagination
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getTopSpenders_Response_200'
        '400':
          description: >-
            Bad Request - API version not supported OR validation failed (dates,
            sources, cursor, pagination)
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
    InsightsTopSpendersGetResponsesContentApplicationJsonSchemaDataItemsUser:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        handle:
          type: string
        displayName:
          type: string
        nickname:
          type:
            - string
            - 'null'
        isTopSpender:
          type: boolean
        avatarUrl:
          type:
            - string
            - 'null'
        registeredAt:
          type: string
          format: date-time
      required:
        - uuid
        - handle
        - displayName
        - nickname
        - isTopSpender
        - avatarUrl
        - registeredAt
    InsightsTopSpendersGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        gross:
          type: number
          format: double
          description: Total gross amount earned from this fan in cents
        net:
          type: number
          format: double
          description: Total net amount earned from this fan in cents
        messages:
          type: number
          format: double
          description: Number of messages exchanged with this fan
        user:
          $ref: >-
            #/components/schemas/InsightsTopSpendersGetResponsesContentApplicationJsonSchemaDataItemsUser
          description: Fan's user information
      required:
        - gross
        - net
        - messages
        - user
    InsightsTopSpendersGetResponsesContentApplicationJsonSchemaPagination:
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
    getTopSpenders_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/InsightsTopSpendersGetResponsesContentApplicationJsonSchemaDataItems
          description: >-
            Array of top spending fans with their spending totals and message
            counts
        pagination:
          $ref: >-
            #/components/schemas/InsightsTopSpendersGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/insights/top-spenders"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/insights/top-spenders'
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

	url := "https://api.fanvue.com/insights/top-spenders"

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

url = URI("https://api.fanvue.com/insights/top-spenders")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/insights/top-spenders")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/insights/top-spenders', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/insights/top-spenders");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/insights/top-spenders")! as URL,
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
