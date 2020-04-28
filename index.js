const http = require("https")
const fs = require("fs")
const list = fs.createWriteStream("list.txt")
const adapterFor = (function () {
  const url = require("url"),
    adapters = {
      "http:": require("http"),
      "https:": require("https"),
    }

  return function (inputUrl) {
    return adapters[url.parse(inputUrl).protocol]
  }
})()

url = "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-AU.txt"

let r = adapterFor(url).get(url, (res) => {
  res.pipe(list)
  let rawData = ""
  res.on("data", (chunk) => {
    rawData += chunk
  })
  res.on("end", () => {
    try {
      const dataset = rawData.trim().split("\n")
      dataset.shift()
      const go = new gmc2json(dataset)
      go.prep()
      fs.writeFile(
        "output.json",
        JSON.stringify(go.exec(), null, 1),
        "utf8",
        function (err) {
          if (err) {
            console.log("An error occured while writing JSON Object to File.")
            return console.log(err)
          }
          console.log("JSON file has been saved.")
        }
      )
    } catch (e) {
      console.error(e.message)
    }
  })
})

class gmc2json {
  constructor(raw) {
    this.raw = raw
    this.workload = []
    this.payload = {}
  }
  splitter(s) {
    const reg = /([0-9]+) - (.*)/gm
    const v = reg.exec(s)
    const o = v[2].split(" > ")
    return {
      id: v[1],
      paths: o,
    }
  }

  prep() {
    this.raw.forEach((i) => {
      this.workload.push(this.splitter(i))
    })
    return this.workload
  }
  exec() {
    let max = 5000000
    let start = 0
    this.workload.forEach((i) => {
      if (start === max) return
      start++
      this.payload[i.paths[0]] = this.dive(
        this.payload[i.paths[0]],
        i.paths,
        1,
        i.id
      )
    })
    return this.payload
  }

  dive(o, list, depth, id) {
    if (depth < list.length) {
      o[list[depth]] = this.dive(o[list[depth]], list, depth + 1, id)
      return o
    } else {
      return {
        id: id,
      }
    }
  }
}
