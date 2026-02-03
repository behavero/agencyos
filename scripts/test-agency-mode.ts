/**
 * Phase 59: Test Agency Mode
 * Verifies agency credentials can access the /creators endpoint
 */

const CLIENT_ID = 'f1cbc082-339e-47c7-8cd8-18a2a997d1b7'
const CLIENT_SECRET = '561a2cf71ad554cd29471d6482d7de63fa90e2f39c4234b2ddedda0a3711e12f'
const AUTH_URL = 'https://auth.fanvue.com/oauth2/token'
const API_URL = 'https://api.fanvue.com'

interface FanvueCreator {
  uuid: string
  handle: string
  displayName: string
  nickname: string | null
  isTopSpender: boolean
  avatarUrl: string | null
  registeredAt: string
  role: string
}

async function testAgencyMode() {
  console.log('🏢 PHASE 59: Testing Agency Mode')
  console.log('=====================================\n')

  try {
    // Step 1: Get Agency Token using Client Credentials
    console.log('🔐 Step 1: Authenticating as Agency...')
    const tokenRes = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'read:creator read:fan read:insights read:chat read:media read:post read:agency',
      }),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error('❌ Authentication Failed:', tokenRes.status, errorText)
      return
    }

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('❌ No access token received:', tokenData)
      return
    }

    console.log('✅ Agency Token Acquired')
    console.log(`   Token: ${tokenData.access_token.substring(0, 20)}...`)
    console.log(`   Expires in: ${tokenData.expires_in} seconds\n`)

    // Step 2: List All Creators
    console.log('👥 Step 2: Fetching Agency Creators...')
    const creatorsRes = await fetch(`${API_URL}/creators?page=1&size=50`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'X-Fanvue-API-Version': '2025-06-26',
      },
    })

    if (!creatorsRes.ok) {
      const errorText = await creatorsRes.text()
      console.error('❌ Failed to fetch creators:', creatorsRes.status, errorText)
      return
    }

    const creatorsData = await creatorsRes.json()
    const creators: FanvueCreator[] = creatorsData.data || []

    console.log('\n=====================================')
    console.log(`✅ SUCCESS! Found ${creators.length} creator(s)`)
    console.log('=====================================\n')

    if (creators.length === 0) {
      console.log('⚠️  No creators found. This might mean:')
      console.log('   - Agency account has no connected creators')
      console.log('   - Credentials are for a creator, not an agency')
      console.log('   - API scopes are insufficient\n')
      return
    }

    // Display creator details
    creators.forEach((creator, index) => {
      console.log(`\n📍 Creator #${index + 1}:`)
      console.log(`   UUID: ${creator.uuid}`)
      console.log(`   Handle: @${creator.handle}`)
      console.log(`   Display Name: ${creator.displayName}`)
      console.log(`   Nickname: ${creator.nickname || 'N/A'}`)
      console.log(`   Avatar: ${creator.avatarUrl || 'No avatar'}`)
      console.log(`   Registered: ${new Date(creator.registeredAt).toLocaleDateString()}`)
      console.log(`   Role: ${creator.role}`)
    })

    console.log('\n=====================================')
    console.log('📊 Summary:')
    console.log(`   Total Creators: ${creators.length}`)
    console.log(`   Unique Handles: ${new Set(creators.map(c => c.handle)).size}`)
    console.log('=====================================\n')

    // Step 3: Test fetching earnings for first creator
    if (creators.length > 0) {
      const firstCreator = creators[0]
      console.log(`\n🔍 Step 3: Testing earnings access for ${firstCreator.displayName}...`)

      const earningsRes = await fetch(
        `${API_URL}/creators/${firstCreator.uuid}/earnings?startDate=2024-01-01T00:00:00Z&endDate=${new Date().toISOString()}&size=5`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'X-Fanvue-API-Version': '2025-06-26',
          },
        }
      )

      if (earningsRes.ok) {
        const earningsData = await earningsRes.json()
        console.log('✅ Earnings API accessible!')
        console.log(`   Sample transactions: ${earningsData.data?.length || 0}`)
      } else {
        const errorText = await earningsRes.text()
        console.log('⚠️  Earnings API issue:', earningsRes.status, errorText)
      }
    }

    console.log('\n✅ Agency Mode Test Complete!')
    console.log('🚀 Ready to implement auto-discovery!\n')
  } catch (error) {
    console.error('\n❌ Test Failed:', error)
    if (error instanceof Error) {
      console.error('   Error:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

// Run the test
testAgencyMode()
