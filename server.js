const express = require('express')
const path = require('path')
const app = express()
const port = 3000

let nextId = 4

const appdata = [
  {
    id: 1,
    name: 'John Doe',
    class: 'Paladin',
    species: 'Human',
    level: 5,
    currHp: 40,
    maxHp: 40,
    status: 'Alive'
  },

  {
    id: 2,
    name: 'Jane Smith',
    class: 'Wizard',
    species: 'Elf',
    level: 3,
    currHp: 10,
    maxHp: 20,
    status: 'Bloodied'
  },

  {
    id: 3,
    name: 'Max',
    class: 'Rogue',
    species: 'Halfling',
    level: 2,
    currHp: 0,
    maxHp: 15,
    status: 'Dead'
  }
]

function getStatus( currHp, maxHp ) {
  if ( currHp <= 0 ) {
    return 'Dead'
  } 
  
  else if ( currHp <= maxHp / 2 ) {
    return 'Bloodied'
  }

  return 'Alive'
}

function parseCharacter(data, existingId = null) {
  const name = String(data.name || '').trim()
  const characterClass = String(data.class || '').trim()
  const species = String(data.species || '').trim()
  const level = Number(data.level)
  const currHp = Number(data.currHp)
  const maxHp = Number(data.maxHp)

  if (!name || !characterClass || !species) {
    throw new Error('Name, class, and species are required.')
  }

  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new Error('Level must be an int from 1 to 20.')
  }

  if (!Number.isFinite(currHp) || !Number.isFinite(maxHp) || maxHp < 1) {
    throw new Error('Current HP and max HP must be valid numbers.')
  }

  if (currHp < 0 || currHp > maxHp) {
    throw new Error('Current HP must be between 0 and max HP.')
  }

  return {
      id: existingId,
      name,
      class: characterClass,
      species,
      level,
      currHp,
      maxHp,
      status: getStatus(currHp, maxHp)
  }
}

app.use(express.json({ limit: '16kb' }))

function requireJsonObject(request, response, next) {
  if (!request.is('application/json')) {
    return response.status(415).json({ error: 'Content-Type must be application/json.' })
  }

  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ error: 'Request body must be a JSON object.' })
  }

  next()
}

app.get('/data', (request, response) => {
  response.json(appdata)
})

app.post('/add', requireJsonObject, (request, response) => {
  let character
  try {
    character = parseCharacter(request.body)
  } catch (error) {
    return response.status(400).json({ error: error.message })
  }

  character.id = nextId++
  appdata.push(character)
  response.json(appdata)
})

app.post('/update', requireJsonObject, (request, response) => {
  const id = Number(request.body.id)
  const index = appdata.findIndex(character => character.id === id)
  if (index === -1) {
    return response.status(404).json({ error: 'Character not found.' })
  }

  try {
    appdata[index] = parseCharacter(request.body, id)
  } catch (error) {
    return response.status(400).json({ error: error.message })
  }
  response.json(appdata)
})

app.post('/delete', requireJsonObject, (request, response) => {
  const id = Number(request.body.id)
  const index = appdata.findIndex(character => character.id === id)
  if (index === -1) {
    return response.status(404).json({ error: 'Character not found.' })
  }

  appdata.splice(index, 1)
  response.json(appdata)
})

app.post('/hp', requireJsonObject, (request, response) => {
  const id = Number(request.body.id)
  const amount = Number(request.body.amount)
  const character = appdata.find(character => character.id === id)
  if (!character) {
    return response.status(404).json({ error: 'Character not found.' })
  }
  if (!Number.isFinite(amount)) {
    return response.status(400).json({ error: 'HP amount must be a number.' })
  }

  character.currHp = Math.max(0, Math.min(character.maxHp, character.currHp + amount))
  character.status = getStatus(character.currHp, character.maxHp)
  response.json(appdata)
})

// Known API paths always return JSON, including unsupported HTTP methods.
app.all(['/data', '/add', '/update', '/delete', '/hp'], (request, response) => {
  response.status(405).json({ error: 'Method not allowed.' })
})

app.use(express.static(path.join(__dirname, 'public')))

app.use((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD' ||
      request.path === '/api' || request.path.startsWith('/api/') ||
      request.is('application/json') || request.get('accept')?.includes('application/json')) {
    return response.status(404).json({ error: 'API endpoint not found.' })
  }
  response.status(404).type('text').send('404 Error: File Not Found')
})

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error)

  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Invalid JSON.' })
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ error: 'Request body exceeds the 16 KB limit.' })
  }

  const status = error.status >= 400 && error.status < 500 ? error.status : 500
  response.status(status).json({
    error: status === 500 ? 'Internal server error.' : 'Invalid request.'
  })
})

if (require.main === module) {
  app.listen(process.env.PORT || port)
}

module.exports = app

