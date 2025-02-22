import { pushRecord, setAbortController } from './shared.mjs'
import PoeAiClient from '../clients/poe'

/**
 * @param {Runtime.Port} port
 * @param {string} question
 * @param {Session} session
 * @param {string} modelName
 */
export async function generateAnswersWithPoeWebApi(port, question, session, modelName) {
  const bot = new PoeAiClient(session.poe_chatId)
  const { messageListener } = setAbortController(port, () => {
    bot.breakMsg()
    bot.close()
  })

  let answer = ''
  await bot
    .ask(
      question,
      modelName,
      (msg) => {
        answer += msg
        port.postMessage({ answer: answer, done: false, session: null })
      },
      () => {
        if (bot.chatId) session.poe_chatId = bot.chatId

        pushRecord(session, question, answer)
        console.debug('conversation history', { content: session.conversationRecords })
        port.onMessage.removeListener(messageListener)
        port.postMessage({ answer: answer, done: true, session: session })
        bot.close()
      },
    )
    .catch((err) => {
      port.onMessage.removeListener(messageListener)
      bot.close()
      throw err
    })
}
