'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Download, Mic, Square } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export function AudioTranscription() {
  const [file, setFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState<string>('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [mode, setMode] = useState<'upload' | 'record'>('upload')

  // {{ edit_1 }} Add useEffect to warn before refreshing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTranscribing) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isTranscribing])
  // {{ end_edit_1 }}

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith('audio/')) {
      setFile(selectedFile)
    } else {
      alert('Please select a valid audio file')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!file) return

    setIsTranscribing(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const result = await response.json()
      setTranscription(result.text)
    } catch (error) {
      console.error('Error during transcription:', error)
      alert('An error occurred during transcription. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const file = new Blob([transcription], {type: 'text/plain'})
    element.href = URL.createObjectURL(file)
    element.download = "transcription.txt" 
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const startRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()
        setIsRecording(true)

        const chunks: BlobPart[] = []
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' })
          setRecordedBlob(blob)
        }
      } catch (error) {
        console.error('Error accessing microphone:', error)
        alert('Unable to access your microphone.')
      }
    } else {
      alert('MediaDevices API not supported in your browser.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleTranscription = async () => {
    if (!recordedBlob) return

    setIsTranscribing(true)

    const formData = new FormData()
    formData.append('file', recordedBlob, 'recording.webm')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const result = await response.json()
      setTranscription(result.text)
    } catch (error) {
      console.error('Error during transcription:', error)
      alert('An error occurred during transcription. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  // {{ edit_2 }} Add handleNewTranscription function
  const handleNewTranscription = () => {
    if (isTranscribing) {
      const confirmReset = window.confirm('A transcription is in progress. Are you sure you want to start a new one?')
      if (!confirmReset) return
    }
    setTranscription('')
    setFile(null)
    setRecordedBlob(null)
    setMode('upload')
  }
  // {{ end_edit_2 }}

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Audio Transcription
          </h2>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          {/* Dropdown to select mode */}
          <Select onValueChange={(value: string) => setMode(value as 'upload' | 'record')} defaultValue="upload">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upload">Upload Audio</SelectItem>
              <SelectItem value="record">Record Audio</SelectItem>
            </SelectContent>
          </Select>

          {/* Conditional Rendering Based on Mode */}
          {mode === 'upload' ? (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div>
                <Label htmlFor="audio-file" className="block text-sm font-medium leading-6 text-gray-900">
                  Upload Audio File
                </Label>
                <Input
                  id="audio-file"
                  name="audio-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Button type="submit" className="flex w-full justify-center" disabled={!file || isTranscribing}>
                  {isTranscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    'Transcribe'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <Label className="block text-sm font-medium text-gray-900">Record Audio</Label>
              <div className="flex space-x-4 mt-2">
                {!isRecording ? (
                  <Button onClick={startRecording} className="flex items-center">
                    <Mic className="mr-2 h-4 w-4" />
                    Record
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="flex items-center">
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                )}
                {recordedBlob && (
                  <Button onClick={handleTranscription} className="flex items-center" disabled={isTranscribing}>
                    {isTranscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      'Transcribe Recording'
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcription Display */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-8 bg-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <h3 className="text-lg font-semibold mb-4">Transcription</h3>
          {transcription ? (
            <>
              <div className="bg-gray-100 p-4 rounded-md min-h-[200px] mb-4">
                {transcription}
              </div>
              <Button onClick={handleDownload} className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Download Transcription
              </Button>
              {/* {{ edit_3 }} */}
              <Button onClick={handleNewTranscription} className="flex items-center mt-4">
                Start New Transcription
              </Button>
              {/* {{ end_edit_3 }} */}
            </>
          ) : (
            <p className="text-gray-500">Transcription will appear here once processed.</p>
          )}
        </div>
      </div>
    </div>
  )
}