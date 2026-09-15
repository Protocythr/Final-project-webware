const tracker = document.querySelector('#tracker')
const form = document.querySelector('#character-form')
const statusMessage = document.querySelector('#app-status')
const errorMessage = document.querySelector('#app-error')
const retryLoad = document.querySelector('#retry-load')
const fields = {
  name: 'name',
  class: 'class',
  species: 'species',
  level: 'level',
  currHp: 'curr-hp',
  maxHp: 'max-hp'
}
let editingId = null
let busy = false

function showError(message = '') {
  errorMessage.textContent = message
  errorMessage.hidden = !message
  if (message) errorMessage.focus()
}

function setBusy(value) {
  busy = value
  tracker.setAttribute('aria-busy', String(value))
  tracker.querySelectorAll('button, input, select').forEach((control) => {
    control.disabled = value
  })
}

function resetEditor() {
  editingId = null
  form.reset()
  document.querySelector('#form-heading').textContent = 'Add Character'
  document.querySelector('#submit-button').textContent = 'Add Character'
  document.querySelector('#cancel-edit').hidden = true
}

function editCharacter(character) {
  if (busy) return
  for (const [field, id] of Object.entries(fields))
    document.getElementById(id).value = character[field]
  editingId = character.id
  document.querySelector('#form-heading').textContent = `Edit ${character.name}`
  document.querySelector('#submit-button').textContent = 'Update Character'
  document.querySelector('#cancel-edit').hidden = false
  showError()
  document.querySelector('#name').focus()
}

function displayCharacters(characters) {
  const list = document.querySelector('#character-list')
  list.replaceChildren()
  document.querySelector('#empty-party').hidden = characters.length !== 0
  document.querySelector('#character-table').hidden = characters.length === 0
  for (const character of characters) {
    const row = document.createElement('tr')
    for (const value of [
      character.name,
      character.class,
      character.species,
      character.level,
      `${character.currHp}/${character.maxHp}`,
      character.status
    ]) {
      const cell = document.createElement('td')
      cell.textContent = value
      row.appendChild(cell)
    }
    const actions = document.createElement('td')
    actions.className = 'character-actions'
    for (const [label, className, action] of [
      ['Edit', 'edit-button', () => editCharacter(character)],
      [
        'Delete',
        'delete-button',
        () =>
          mutate('/delete', { id: character.id }, 'Character deleted.', () => {
            if (editingId === character.id) resetEditor()
          })
      ],
      ['Add HP', 'add-hp-button', () => adjustHp(character, 1)],
      ['Subtract HP', 'subtract-hp-button', () => adjustHp(character, -1)]
    ]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${className} btn btn-sm ${className === 'delete-button' ? 'btn-danger' : 'btn-outline-dark'} m-1`
      button.textContent = label
      button.setAttribute('aria-label', `${label}: ${character.name}`)
      button.addEventListener('click', action)
      actions.appendChild(button)
    }
    row.appendChild(actions)
    list.appendChild(row)
  }
}

async function mutate(endpoint, body, successMessage, onSuccess = () => {}) {
  if (busy) return
  setBusy(true)
  showError()
  statusMessage.textContent = 'Saving changes...'
  try {
    const characters = await partyApi.post(endpoint, body)
    displayCharacters(characters)
    onSuccess()
    statusMessage.textContent = successMessage
  } catch (error) {
    showError(error.message)
    statusMessage.textContent = ''
  } finally {
    setBusy(false)
    if (errorMessage.hidden) document.querySelector('#submit-button').focus()
  }
}

function adjustHp(character, direction) {
  if (busy) return
  const answer = window.prompt(
    `${direction > 0 ? 'Add' : 'Subtract'} how much HP for ${character.name}?`
  )
  if (answer === null) return
  const amount = Number(answer)
  if (!Number.isFinite(amount) || amount <= 0) {
    showError('Enter an HP amount greater than zero.')
    return
  }
  return mutate('/hp', { id: character.id, amount: direction * amount }, 'HP updated.')
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const body = Object.fromEntries(
    Object.entries(fields).map(([field, id]) => [field, document.getElementById(id).value])
  )
  const editing = editingId !== null
  if (editing) body.id = editingId
  mutate(
    editing ? '/update' : '/add',
    body,
    editing ? 'Character updated.' : 'Character added.',
    resetEditor
  )
})

document.querySelector('#cancel-edit').addEventListener('click', () => {
  resetEditor()
  showError()
  statusMessage.textContent = 'Editing canceled.'
  document.querySelector('#name').focus()
})

document.querySelector('#logout-button').addEventListener('click', async () => {
  if (busy) return
  setBusy(true)
  showError()
  statusMessage.textContent = 'Logging out...'
  try {
    await partyApi.post('/auth/logout', {})
    tracker.hidden = true
    window.location.replace('/login.html')
  } catch (error) {
    showError(error.message)
    statusMessage.textContent = ''
    setBusy(false)
  }
})

async function initializeTracker() {
  setBusy(true)
  retryLoad.hidden = true
  showError()
  statusMessage.textContent = 'Checking your session...'
  try {
    const { user } = await partyApi.get('/auth/me')
    document.querySelector('#username').textContent = user.username
    tracker.hidden = false
    statusMessage.textContent = 'Loading your party...'
    displayCharacters(await partyApi.get('/data'))
    statusMessage.textContent = 'Your party is up to date.'
    setBusy(false)
  } catch (error) {
    if (error.status === 401) return
    showError(error.message)
    statusMessage.textContent = ''
    retryLoad.hidden = false
    document.querySelector('#logout-button').disabled = false
    busy = false
  }
}

retryLoad.addEventListener('click', initializeTracker)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload()
})
initializeTracker()
