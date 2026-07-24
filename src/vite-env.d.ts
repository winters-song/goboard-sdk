interface Window {
  webkitAudioContext: typeof AudioContext
  goboardPlayer: unknown
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.mp3' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
