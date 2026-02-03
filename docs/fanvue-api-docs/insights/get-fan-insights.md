# Get fan insights

GET https://api.fanvue.com/insights/fans/{userUuid}

Returns detailed insights about a specific fan for the authenticated creator, including spending statistics, subscription status, and fan engagement metrics.

<Info>Scopes required: `read:insights`, `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/insights/get-fan-insights

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get fan insights
  version: endpoint_.getFanInsights
paths:
  /insights/fans/{userUuid}:
    get:
      operationId: get-fan-insights
      summary: Get fan insights
      description: >-
        Returns detailed insights about a specific fan for the authenticated
        creator, including spending statistics, subscription status, and fan
        engagement metrics.


        <Info>Scopes required: `read:insights`, `read:fan`</Info>
      tags:
        - []
      parameters:
        - name: userUuid
          in: path
          description: Fan's UUID
          required: true
          schema:
            type: string
            format: uuid
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
          description: Fan insights data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getFanInsights_Response_200'
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
        '404':
          description: Not Found Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaStatus:
      type: string
      enum:
        - value: subscriber
        - value: expired
        - value: follower
        - value: not_contactable
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingTotal:
      type: object
      properties:
        gross:
          type: number
          format: double
          description: Total gross amount spent by fan in cents
      required:
        - gross
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingMaxSinglePayment:
      type: object
      properties:
        gross:
          type: number
          format: double
          description: Maximum single payment amount in cents
      required:
        - gross
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingSources:
      type: object
      properties:
        gross:
          type: number
          format: double
          description: Total gross amount for this payment type in cents
      required:
        - gross
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpending:
      type: object
      properties:
        lastPurchaseAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date of last purchase (ISO 8601) or null if no purchases
        total:
          $ref: >-
            #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingTotal
        maxSinglePayment:
          $ref: >-
            #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingMaxSinglePayment
        sources:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpendingSources
          description: Breakdown of spending by source
      required:
        - lastPurchaseAt
        - total
        - maxSinglePayment
        - sources
    InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSubscription:
      type: object
      properties:
        createdAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date subscription was created (ISO 8601) or null if no subscription
        renewsAt:
          type:
            - string
            - 'null'
          format: date-time
          description: >-
            Date subscription renews (ISO 8601) or null if no active
            subscription
        autoRenewalEnabled:
          type: boolean
          description: Whether fan has active recurring subscription
      required:
        - createdAt
        - renewsAt
        - autoRenewalEnabled
    getFanInsights_Response_200:
      type: object
      properties:
        status:
          $ref: >-
            #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaStatus
          description: Current fan status
        spending:
          $ref: >-
            #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSpending
        subscription:
          $ref: >-
            #/components/schemas/InsightsFansUserUuidGetResponsesContentApplicationJsonSchemaSubscription
      required:
        - status
        - spending
        - subscription
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/insights/fans/userUuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/insights/fans/userUuid'
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

	url := "https://api.fanvue.com/insights/fans/userUuid"

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

url = URI("https://api.fanvue.com/insights/fans/userUuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/insights/fans/userUuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/insights/fans/userUuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/insights/fans/userUuid");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/insights/fans/userUuid")! as URL,
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
