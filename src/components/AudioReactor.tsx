import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
import { useSensorStore } from '../store/sensorStore'

export const AudioReactor = () => {
  const { globalAlert, getAllSensors, voidMode } = useSensorStore()
  const synthRef = useRef<Tone.Synth | null>(null)
  const distortionRef = useRef<Tone.Distortion | null>(null)
  const alertTimeoutRef = useRef<number | null>(null)
  const ambientIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize audio context
    const initAudio = async () => {
      await Tone.start()

      // Base ambient synth
      const synth = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 2, decay: 1, sustain: 0.5, release: 3 },
      })

      const distortion = new Tone.Distortion(0.8)
      const reverb = new Tone.Reverb({ roomSize: 0.9, wet: 0.3 })
      const filter = new Tone.Filter(200, 'lowpass')

      synth.chain(distortion, filter, reverb, Tone.Destination)

      synthRef.current = synth
      distortionRef.current = distortion

      // Start ambient hum
      if (synth && !synth.disposed) {
        synth.triggerAttackRelease('C2', '8n', undefined, 0.1)
        ambientIntervalRef.current = setInterval(() => {
          if (synth && !synth.disposed) {
            synth.triggerAttackRelease('C2', '8n', undefined, 0.05)
          } else {
            if (ambientIntervalRef.current) {
              clearInterval(ambientIntervalRef.current)
              ambientIntervalRef.current = null
            }
          }
        }, 2000)
      }
    }

    initAudio()

    return () => {
      if (ambientIntervalRef.current) {
        clearInterval(ambientIntervalRef.current)
        ambientIntervalRef.current = null
      }
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
      if (distortionRef.current) {
        distortionRef.current.dispose()
        distortionRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (globalAlert && synthRef.current && distortionRef.current) {
      // Alert sound: distorted screech + bass drop
      const synth = synthRef.current
      const distortion = distortionRef.current

      distortion.distortion = 1.0
      synth.triggerAttackRelease('A4', '4n', undefined, 0.8)
      
      setTimeout(() => {
        synth.triggerAttackRelease('C1', '2n', undefined, 0.9)
      }, 200)

      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current)
      }

      alertTimeoutRef.current = window.setTimeout(() => {
        if (distortion) {
          distortion.distortion = 0.8
        }
      }, 1000)
    }
  }, [globalAlert])

  useEffect(() => {
    // Adjust volume based on sensor activity
    if (synthRef.current) {
      const sensors = getAllSensors()
      if (sensors.length > 0) {
        const activeCount = sensors.filter((s) => s.status !== 'online').length
        const volume = Math.min(-20 + (activeCount / sensors.length) * 10, 0)
        
        if (synthRef.current.volume) {
          synthRef.current.volume.value = volume
        }
      }
    }
  }, [getAllSensors, voidMode])

  return null // Audio component doesn't render anything
}

