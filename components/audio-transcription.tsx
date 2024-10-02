'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Download, Mic, Square } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea" // {{ edit_1 }}

export function AudioTranscription() {
  const [file, setFile] = useState<File | null>(null)
  const [transcription, setTranscription] = useState<string>('') // {{ edit_2 }}
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [mode, setMode] = useState<'upload' | 'record'>('record') // Changed default to 'record'

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
      // Append new transcription with a newline separator
      setTranscription(prev => prev ? `${prev}\n\n${result.text}` : result.text)
    } catch (error) {
      console.error('Error during transcription:', error)
      alert('An error occurred during transcription. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleDownload = () => {
    const element = document.createElement("a")
    const fileContent = transcription // Already a single string with appended text
    const file = new Blob([fileContent], { type: 'text/plain' })
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
      // Append new transcription with a newline separator
      setTranscription(prev => prev ? `${prev}\n\n${result.text}` : result.text)
    } catch (error) {
      console.error('Error during transcription:', error)
      alert('An error occurred during transcription. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleNewTranscription = () => {
    if (isTranscribing) {
      const confirmReset = window.confirm('A transcription is in progress. Are you sure you want to start a new one?')
      if (!confirmReset) return
    }
    setTranscription('')
    setFormalLetter('')
    setFile(null)
    setRecordedBlob(null)
    setMode('upload')
    setConversionType('letter')
  }

  const handleTranscriptionChange = (value: string) => {
    setTranscription(value)
  }

  // {{ edit_3 }} Add Convert to Letter button and handler
  const [formalLetter, setFormalLetter] = useState<string>('')

  // {{ edit_4 }} Introduce separate state for conversion
  const [isConverting, setIsConverting] = useState(false)

  // {{ edit_10 }} Add state for conversion type
  const [conversionType, setConversionType] = useState<'letter' | 'notes'>('letter')

  // {{ edit_12 }} Update handleConvert to include conversion type
  const handleConvert = async () => {
    if (!transcription) {
      alert('There is no transcription to convert.')
      return
    }

    setIsConverting(true)

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcription, type: conversionType }),
      })

      if (!response.ok) {
        throw new Error('Conversion failed')
      }

      const result = await response.json()
      if (conversionType === 'letter') {
        setFormalLetter(result.formalLetter)
      } else {
        setFormalLetter(result.formalLetter) // You might want to rename state if handling notes separately
      }
    } catch (error) {
      console.error('Error during conversion:', error)
      alert('An error occurred during conversion. Please try again.')
    } finally {
      setIsConverting(false)
    }
  }
  // {{ end_edit_12 }}

  return (
    <div className="flex min-h-screen bg-gray-100 flex-col md:flex-row">
      <div className="w-full  lg:w-1/3 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Audio Transcription
          </h2>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          {/* Dropdown to select mode */}
          <Select onValueChange={(value: string) => setMode(value as 'upload' | 'record')} defaultValue="record">
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
      <div className="w-full lg:w-2/3 flex flex-col justify-center px-6 py-12 lg:px-8 bg-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <h3 className="text-lg font-semibold mb-4">Transcription</h3>
          {transcription ? (
            <>
              {/* Conversion Type Switch - Visible Only After Transcription */}
              <div className="flex items-center mb-4">
                <Label className="mr-2">Conversion Type:</Label>
                <Select
                  onValueChange={(value: string) =>
                    setConversionType(value as 'letter' | 'notes')
                  }
                  defaultValue="letter"
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">Letter</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formalLetter ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">
                    {conversionType === 'letter' ? 'Formal Letter' : 'Structured Notes'}
                  </h3>
                  <Textarea
                    value={formalLetter}
                    readOnly
                    className="bg-gray-100 p-4 rounded-md min-h-[200px] mb-4"
                  />
                  <Button onClick={handleDownload} className="flex items-center mt-2">
                    <Download className="mr-2 h-4 w-4" />
                    Download {conversionType === 'letter' ? 'Formal Letter' : 'Structured Notes'}
                  </Button>
                  <Button
                    onClick={handleNewTranscription}
                    className="flex items-center mt-4"
                    disabled={isConverting || isTranscribing}
                  >
                    Start New Transcription
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea
                    value={transcription}
                    onChange={(e) => handleTranscriptionChange(e.target.value)}
                    className="bg-gray-100 p-4 rounded-md min-h-[200px] mb-4"
                  />
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleDownload}
                      className="flex items-center mt-2"
                      disabled={isTranscribing}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Transcription
                    </Button>
                    <Button
                      onClick={handleConvert}
                      className="flex items-center mt-2"
                      disabled={isConverting || isTranscribing}
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        'Convert'
                      )}
                    </Button>
                    <Button
                      onClick={handleNewTranscription}
                      className="flex items-center mt-2"
                      disabled={isTranscribing || isConverting}
                    >
                      Start New Transcription
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-gray-500">Transcription will appear here once processed.</p>
          )}
        </div>
      </div>
    </div>
  )
}