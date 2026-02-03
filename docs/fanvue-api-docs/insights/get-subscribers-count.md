# Get subscribers count

GET https://api.fanvue.com/insights/subscribers

Returns cursor-paginated subscribers count for the authenticated creator over a specified time period.

Data is aggregated daily with timezone-aware boundaries. When dates include timezone offsets, results are normalized to midnight in that timezone (expressed as UTC).

<Info>Scope required: `read:insights`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/insights/get-subscribers

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get subscribers count
  version: endpoint_.getSubscribers
paths:
  /insights/subscribers:
    get:
      operationId: get-subscribers
      summary: Get subscribers count
      description: >-
        Returns cursor-paginated subscribers count for the authenticated creator
        over a specified time period.


        Data is aggregated daily with timezone-aware boundaries. When dates
        include timezone offsets, results are normalized to midnight in that
        timezone (expressed as UTC).


        <Info>Scope required: `read:insights`</Info>
      tags:
        - []
      parameters:
        - name: startDate
          in: query
          description: >-
            Start date as ISO 8601 datetime string with optional timezone offset
            (e.g., 2024-10-20T00:00:00+01:00 or 2024-10-20T00:00:00Z). Data is
            aggregated daily with timezone-aware boundaries. Time component is
            ignored for daily aggregation.
          required: false
          schema:
            type: string
            format: date-time
        - name: endDate
          in: query
          description: >-
            End date as ISO 8601 datetime string with optional timezone offset
            (e.g., 2024-10-25T00:00:00+01:00 or 2024-10-25T00:00:00Z).
            Non-inclusive - data before this date is included. Data is
            aggregated daily with timezone-aware boundaries. Time component is
            ignored for daily aggregation.
          required: false
          schema:
            type: string
            format: date-time
        - name: cursor
          in: query
          description: >-
            Cursor for pagination - If given, pass `nextCursor` to get the next
            page.
          required: false
          schema:
            type: string
        - name: size
          in: query
          description: 'Number of items to return per page (1-50, default: 20)'
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
          description: Subscribers data with cursor pagination
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getSubscribers_Response_200'
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
    InsightsSubscribersGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        date:
          type: string
          format: date-time
          description: >-
            Date as UTC ISO 8601 datetime string representing midnight in the
            requested timezone (e.g., '2024-01-05T23:00:00.000Z' for midnight
            +01:00)
        total:
          type: number
          format: double
          description: >-
            Net subscriber change from query start date (cumulative sum, can be
            negative)
        newSubscribersCount:
          type: number
          format: double
          description: Number of new subscribers for this period
        cancelledSubscribersCount:
          type: number
          format: double
          description: Number of cancelled subscribers for this period
      required:
        - date
        - total
        - newSubscribersCount
        - cancelledSubscribersCount
    getSubscribers_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/InsightsSubscribersGetResponsesContentApplicationJsonSchemaDataItems
        nextCursor:
          type:
            - string
            - 'null'
          description: Cursor for next page, null if no more data
      required:
        - data
        - nextCursor
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/insights/subscribers"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/insights/subscribers'
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

	url := "https://api.fanvue.com/insights/subscribers"

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

url = URI("https://api.fanvue.com/insights/subscribers")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/insights/subscribers")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/insights/subscribers', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/insights/subscribers");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/insights/subscribers")! as URL,
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
