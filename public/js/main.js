let editingId = null

const submit = async function(event) {
    event.preventDefault()

    const name = document.querySelector('#name').value
    const characterClass = document.querySelector('#class').value
    const species = document.querySelector('#species').value
    const level = document.querySelector('#level').value
    const currHp = document.querySelector('#curr-hp').value
    const maxHp = document.querySelector('#max-hp').value

    const json = {
        name: name,
        class: characterClass,
        species: species,
        level: level,
        currHp: currHp,
        maxHp: maxHp
    }

    const endpoint = editingId === null ? '/add' : '/update'

    if (editingId !== null) {
      json.id = editingId
    }

    const body = JSON.stringify(json)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.error)
      return
    }

    editingId = null
    document.querySelector('#character-form').reset()
    document.querySelector('#submit-button').textContent = 'Add Character'

    displayCharacters(data)
}

const displayCharacters = function(characters) {
  const list = document.querySelector('#character-list')
  list.innerHTML = ''

  characters.forEach(function(character) {
    const row = document.createElement('tr')

    row.innerHTML = `
      <td>${character.name}</td>
      <td>${character.class}</td>
      <td>${character.species}</td>
      <td>${character.level}</td>
      <td>${character.currHp}/${character.maxHp}</td>
      <td>${character.status}</td>
      <td>
        <button class="edit-button" data-id="${character.id}">
          Edit
        </button>

        <button class="delete-button" data-id="${character.id}">
          Delete
        </button>

        <button class="add-hp-button" data-id="${character.id}">
          Add HP
        </button>

        <button class="subtract-hp-button" data-id="${character.id}">
          Subtract HP
        </button>
      </td>
    `

    list.appendChild(row)
  })

  const buttons = document.querySelectorAll('.delete-button')

  buttons.forEach(function(button) {
    button.onclick = function() {
      deleteCharacter(button.dataset.id)
    }
  })

  const editButtons = document.querySelectorAll('.edit-button')

  editButtons.forEach(function(button) {
    button.onclick = function() {
      const id = button.dataset.id

      const character = characters.find(function(character) {
        return character.id === id
      })

      document.querySelector('#name').value = character.name
      document.querySelector('#class').value = character.class
      document.querySelector('#species').value = character.species
      document.querySelector('#level').value = character.level
      document.querySelector('#curr-hp').value = character.currHp
      document.querySelector('#max-hp').value = character.maxHp

      editingId = character.id
      document.querySelector('#submit-button').textContent = 'Update Character'
    }

  })

  const addHpButtons = document.querySelectorAll('.add-hp-button')

  addHpButtons.forEach(function(button) {
    button.onclick = function() {
      const amount = Number(prompt('Adding HP:'))

      if (!Number.isFinite(amount) || amount <= 0) {
        return
      }

      const id = button.dataset.id
      changeHp(id, amount)
    }

  })

  const subtractHpButtons = document.querySelectorAll('.subtract-hp-button')
  subtractHpButtons.forEach(function(button) {
    button.onclick = function() {
      const amount = Number(prompt('Subtracting HP:'))

      if (!Number.isFinite(amount) || amount <= 0) {
        return
      }

      const id = button.dataset.id
      changeHp(id, -amount)
    }
  })
}

const loadCharacters = async function() {
  try {
    const response = await fetch('/data')
    const data = await response.json()
    if (!response.ok) {
      alert(data.error)
      return
    }
    displayCharacters(data)
  } catch {
    alert('Unable to load characters. Check your connection and try again.')
  }
}

const deleteCharacter = async function(id) {
  const response = await fetch('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: id
    })
  })

  const data = await response.json()

  if (!response.ok) {
    alert(data.error)
    return
  }

  displayCharacters(data)
}

const changeHp = async function(id, amount) {
  const response = await fetch('/hp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: id,
      amount: amount
    })
  })

  const data = await response.json()

  if (!response.ok) {
    alert(data.error)
    return
  }

  displayCharacters(data)
}

window.onload = function() {
  const form = document.querySelector('#character-form')
  form.onsubmit = submit
  loadCharacters()
}
