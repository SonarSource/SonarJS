export function getArrayStats(list) {
    let delta = []
    let deltaSq = []

    let sum = 0
    let deltaSum = 0
    let deltaSquaredSum = 0
    let count = list.length

    list.sort((a, b) => {
      return a - b
    })

    let median = list[Math.floor(count / 2)]
    let range = [Math.min(...list), Math.max(...list)]

    list.forEach((item) => {
      sum = sum + item
    })
    let mean = sum / count

    list.forEach((item) => {
      delta.push(Math.abs(item - mean))
    })

    delta.forEach((item) => {
      deltaSq.push(item * item)
      deltaSum = deltaSum + item
    })

    deltaSquaredSum = deltaSq.reduce((a, b) => { // Noncompliant: Reduce of empty array with no initial value
      return a + b
    })

    let deltaMean = deltaSum / count
    let stdDev = Math.sqrt(deltaSquaredSum / count - 1)

    let stdRange = [mean - stdDev - stdDev, mean + stdDev + stdDev]

    return {
      count,
      deltaMean,
      mean,
      median,
      range,
      sum,
      stdDev,
      stdRange,
    }
  }
