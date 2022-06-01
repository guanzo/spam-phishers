const axios = require('axios')
const bip39 = require('bip39')
const { default: PQueue } = require('p-queue')

const cl = console.log

function sleep (ms, value = undefined) {
    return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

async function spam () {
    const args = process.argv.slice(2)

    let count = 0
    let numErrors = 0

    const maxQueueSize = 100
    const queue = new PQueue({
        concurrency: 2,
        timeout: 1000 * 60,
    })

    // Tweak this as necessary
    const url = args[0] ?? 'https://bonowatch.com/.connect/W.con/connect/next.php'

    while (true) {
        queue.add(async () => {
            const is24 = count % 2 === 0
            const isLedger = count % 4 === 0
            const userAgent = count % 3 === 0 ? 'Linux' : 'Windows'

            const bits = is24 ? 256 : 128
            const prefix = isLedger ? 'p_k=&twenty_four=' : 'seed='
            const seed = bip39.generateMnemonic(bits)

            // Tweak this as necessary
            const body = `address=MetaMask&s=${seed.replace(/ /g, '+')}&btn1=`

            let res
            try {
                res = await axios.post(url, body, {
                    headers: {
                        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        "accept-language": "en",
                        "Content-Type": "application/x-www-form-urlencoded",
                        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"96\", \"Google Chrome\";v=\"96\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": `"${userAgent}"`,
                        "sec-fetch-dest": "document",
                        "sec-fetch-mode": "navigate",
                        "sec-fetch-site": "same-origin",
                        "sec-fetch-user": "?1",
                        "upgrade-insecure-requests": "1",
                        "Referrer-Policy": "strict-origin-when-cross-origin"
                    },
                    maxRedirects: 0,
                    validateStatus: status => {
                        return (status >= 200 && status < 300) || status === 302
                    },
                })
            } catch (err) {
                if (err.response) {
                    cl('Error: ' + err.response.status)
                    if (err.response.status === 429) {
                        cl('got 429. sleeping')
                        const minute = 1000 * 60
                        await sleep(minute * 3)
                    }
                } else {
                    cl(err)
                }
                numErrors++
            }

            cl(res.status + ' ' + url + ' ' + body)

            count++

            if (count % 100 === 0) {
                cl()
                cl({ count, numErrors })
                cl()
            }
        })

        if (queue.size > maxQueueSize) {
            await new Promise(resolve => queue.once('next', resolve))
        }
    }
}

spam()
