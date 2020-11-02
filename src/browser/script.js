
const apiKeyInputElement = document.querySelector('[name=api_key]')
const userIdInputElement = document.querySelector('[name=user_id]')


document.querySelector('[data-js-action=clickSave]').addEventListener('click', () => {
    window.api.saveConfig(apiKeyInputElement.value, userIdInputElement.value)
})

window.api.on('load_config', ({apiKey, userId}) => {
    apiKeyInputElement.setAttribute('value', apiKey);
    userIdInputElement.setAttribute('value', userId);
})