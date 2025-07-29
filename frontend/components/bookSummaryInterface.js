"use client";

import { Input, Button, Select, SelectItem, Progress, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import { Search, AlertCircle, CheckCircle, BookOpen, Brain, Globe, Zap, Shield, ExternalLink } from 'lucide-react';
import { useState, useRef } from 'react';
import { getAccessToken } from '@auth0/nextjs-auth0';



const languages = [
    { key: 'en', label: 'English' },
    { key: 'de', label: 'Deutsch' },
    { key: 'fr', label: 'Français' },
    { key: 'es', label: 'Español' },
    { key: 'it', label: 'Italiano' }
];

const models = [
    { key: 'mistral_latest__300', label: 'mistral:latest (300 characters)' },
    { key: 'gemma3n_e2b__300', label: 'gemma3n:e2b (300 characters)' },
    { key: 'llama3_1_latest__300', label: 'llama3.1:latest (300 characters)' },
    { key: 'mistral_latest__1000', label: 'mistral:latest (1000 characters)' },
    { key: 'gemma3n_e2b__1000', label: 'gemma3n:e2b (1000 characters)' },
    { key: 'llama3_1_latest__1000', label: 'llama3.1:latest (1000 characters)' }
];

const statusMapping = {
    'validating_isbn': { text: 'Validating ISBN…', progress: 20 },
    'collecting_data': { text: 'Collecting book data…', progress: 40 },
    'data_collected': { text: 'Finished collecting data', progress: 60 },
    'generating_summary': { text: 'Making summary request to ai engine', progress: 80 },
    'completed': { text: 'Finished generating ai summary', progress: 100 },
    'failed': { text: 'Failed to generate summary', progress: 100 }
};


export default function BookSummaryInterface({ session }) {
    const [isbn, setIsbn] = useState('');
    const [language, setLanguage] = useState('en');
    const [model, setModel] = useState('mistral_latest__300');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [confidenceScore, setConfidenceScore] = useState(87);
    const [taskId, setTaskId] = useState(null);
    const [summaryData, setSummaryData] = useState(null);

    const getFreshAccessToken = async () => {
        try {
            const token = await getAccessToken();
            return token;
        } catch (error) {
            console.error('Error getting access token:', error);
            throw new Error('Failed to get access token. Please try logging in again.');
        }
    };


    // Use ref to store polling interval ID
    const pollingIntervalRef = useRef(null);

    const validateISBN = (value) => {
        // Basic ISBN validation (10 or 13 digits with optional hyphens)
        const cleanISBN = value.replace(/[-\s]/g, '');
        if (!cleanISBN) {
            setError('');
            return;
        }
        if (!/^\d{10}(\d{3})?$/.test(cleanISBN)) {
            setError('Invalid ISBN format. Please enter a 10 or 13 digit ISBN.');
        } else {
            setError('');
        }
    };

    const handleInputChange = (value) => {
        setIsbn(value);
        validateISBN(value);
    };

    // Start the summary request and get task ID
    const startSummaryRequest = async () => {
        try {

            const accessToken = await getFreshAccessToken();

            const response = await fetch(process.env.NEXT_PUBLIC_MAIN_SERVER_BASE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isbn,
                    language,
                    model
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Started summary request:', data);

            return data.id;
        } catch (error) {
            console.error('Error starting summary request:', error);
            throw error;
        }
    };

    // Poll for status updates
    const pollStatus = async (taskId) => {
        try {
            const accessToken = await getFreshAccessToken();

            const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_SERVER_BASE_URL}/status/${taskId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // console.log('Status update:', data);

            return data;
        } catch (error) {
            console.error('Error polling status:', error);
            throw error;
        }
    };

    // Clear polling interval
    const clearPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // Main function to handle the summary request with polling
    const makeSummaryRequest = async () => {
        try {
            // Start the summary request
            const taskId = await startSummaryRequest();
            setTaskId(taskId);

            // Start polling every 5 seconds
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const statusData = await pollStatus(taskId);

                    // Use status mapping for progress and step text
                    const statusInfo = statusMapping[statusData.status];
                    if (statusInfo) {
                        setProgress(statusInfo.progress);
                        setCurrentStep(statusInfo.text);
                    }

                    // Update UI based on status
                    if (statusData.status === 'completed') {
                        setSummaryData(statusData);
                        setConfidenceScore(statusData.medium_confidence);

                        // Stop polling and show results
                        clearPolling();
                        setIsProcessing(false);
                        setShowResult(true);

                    } else if (statusData.status === 'failed') {
                        setCurrentStep('Summary generation failed');
                        setError('Failed to generate summary: Book not found');

                        clearPolling();
                        setIsProcessing(false);
                    }

                } catch (error) {
                    console.error('Polling error:', error);
                    setError('Connection error while checking status');
                    clearPolling();
                    setIsProcessing(false);
                }
            }, 3000);


        } catch (error) {
            console.error('Error starting summary request:', error);
            setError('Failed to generate summary: Book not found');
            setIsProcessing(false);
        }
    };

    const handleSummarize = async () => {
        if (error || !isbn.trim()) return;

        // Reset states
        setIsProcessing(true);
        setShowResult(false);
        setProgress(0);
        setCurrentStep('Starting summary generation...');
        setError('');
        setSummaryData(null);
        setTaskId(null);

        // Clear any existing polling
        clearPolling();

        await makeSummaryRequest();
    };

    // Cleanup polling on component unmount
    const handleCancel = () => {
        clearPolling();
        setIsProcessing(false);
        setProgress(0);
        setCurrentStep('');
        setTaskId(null);
    };

    const getConfidenceColor = (score) => {
        if (score >= 90) return 'success';
        if (score >= 75) return 'warning';
        return 'danger';
    };

    const getConfidenceLabel = (score) => {
        if (score >= 90) return 'High Confidence';
        if (score >= 75) return 'Medium Confidence';
        return 'Low Confidence';
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                        <BookOpen className="w-10 h-10 text-blue-400" />
                        EKZ Book Summarizer
                    </h1>
                    <p className="text-gray-400">Get intelligent book summaries with confidence metrics</p>
                </div>

                {/* Main Input Form */}
                <Card className="bg-gray-800 border-gray-700">
                    <CardBody className="space-y-6">
                        {/* ISBN Input */}
                        <div className="space-y-2">
                            <label className="text-white text-sm font-medium">ISBN Number</label>
                            <Input
                                type="text"
                                placeholder="Enter ISBN (e.g., 978-0123456789)"
                                value={isbn}
                                onValueChange={handleInputChange}
                                isInvalid={!!error}
                                errorMessage={error}
                                classNames={{
                                    inputWrapper: "bg-gray-700 border-gray-600 hover:bg-gray-600 focus-within:bg-gray-600",
                                    input: "text-white placeholder:text-gray-400",
                                }}
                                startContent={<Search className="text-gray-400 w-5 h-5" />}
                                endContent={
                                    !error && isbn.trim() ? (
                                        <CheckCircle className="text-green-400 w-5 h-5" />
                                    ) : error ? (
                                        <AlertCircle className="text-red-400 w-5 h-5" />
                                    ) : null
                                }
                            />
                        </div>

                        {/* Dropdowns Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-white text-sm font-medium flex items-center gap-2">
                                    <Globe className="w-4 h-4" />
                                    Summary Language
                                </label>
                                <Select
                                    selectedKeys={[language]}
                                    onSelectionChange={(keys) => setLanguage(Array.from(keys)[0])}
                                    classNames={{
                                        trigger: "bg-gray-700 border-gray-600 hover:bg-gray-600",
                                        value: "text-white",
                                        popoverContent: "bg-gray-800 border-gray-600",
                                    }}
                                >
                                    {languages.map((lang) => (
                                        <SelectItem key={lang.key} value={lang.key} className="text-white">
                                            {lang.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-white text-sm font-medium flex items-center gap-2">
                                    <Brain className="w-4 h-4" />
                                    AI Model
                                </label>
                                <Select
                                    selectedKeys={[model]}
                                    onSelectionChange={(keys) => setModel(Array.from(keys)[0])}
                                    classNames={{
                                        trigger: "bg-gray-700 border-gray-600 hover:bg-gray-600",
                                        value: "text-white",
                                        popoverContent: "bg-gray-800 border-gray-600",
                                    }}
                                >
                                    {models.map((modelOption) => (
                                        <SelectItem key={modelOption.key} value={modelOption.key} className="text-white">
                                            {modelOption.label}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                color="primary"
                                size="lg"
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onPress={handleSummarize}
                                isDisabled={!!error || !isbn.trim() || isProcessing}
                                startContent={<Zap className="w-5 h-5" />}
                            >
                                {isProcessing ? 'Processing...' : 'Summarize Book'}
                            </Button>

                            {isProcessing && (
                                <Button
                                    color="danger"
                                    variant="outline"
                                    size="lg"
                                    onPress={handleCancel}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Progress Section */}
                {isProcessing && (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardBody className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                                    <span className="text-white font-medium">Processing Your Request</span>
                                </div>
                                {taskId && (
                                    <span className="text-gray-400 text-sm">Task ID: {taskId}</span>
                                )}
                            </div>

                            <Progress
                                value={progress}
                                className="w-full"
                                color="primary"
                                size="md"
                            />

                            <p className="text-gray-400 text-sm">{currentStep}</p>
                            <p className="text-gray-500 text-xs">{Math.round(progress)}% complete</p>
                        </CardBody>
                    </Card>
                )}

                {/* Results Section */}
                {showResult && summaryData && (
                    <div className="space-y-6">
                        {/* Book Info & Confidence */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {summaryData.title}
                                    </h3>
                                    <p className="text-gray-400">
                                        by {summaryData.authors}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <Chip
                                        color={getConfidenceColor(confidenceScore)}
                                        variant="flat"
                                        size="lg"
                                        startContent={<Shield className="w-4 h-4" />}
                                    >
                                        {getConfidenceLabel(confidenceScore)} ({confidenceScore}%)
                                    </Chip>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* AI Confidence Metrics */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-purple-400" />
                                    AI Confidence Metrics
                                </h4>
                            </CardHeader>
                            <CardBody className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300 text-sm">Source Reliability</span>
                                            <span className="text-white text-sm">
                                                {summaryData.source_reliability}%
                                            </span>
                                        </div>
                                        <Progress value={summaryData.source_reliability} color="success" size="sm" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300 text-sm">Content Coverage</span>
                                            <span className="text-white text-sm">
                                                {summaryData.content_coverage}%
                                            </span>
                                        </div>
                                        <Progress value={summaryData.content_coverage} color="warning" size="sm" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-300 text-sm">Cross-Reference</span>
                                            <span className="text-white text-sm">
                                                {summaryData.cross_reference}%
                                            </span>
                                        </div>
                                        <Progress value={summaryData.cross_reference} color="primary" size="sm" />
                                    </div>
                                </div>


                            </CardBody>
                        </Card>

                        {/* Summary */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <h4 className="text-lg font-semibold text-white">AI Generated Summary</h4>
                            </CardHeader>
                            <CardBody>
                                <div className="prose prose-invert max-w-none">
                                    {summaryData.generated_summary.split('\n\n').map((paragraph, index) => (
                                            <p key={index} className="text-gray-300 leading-relaxed mt-4 first:mt-0">
                                                {paragraph}
                                            </p>
                                        ))
                                    }
                                </div>
                            </CardBody>
                        </Card>

                        {/* Source Attribution */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <ExternalLink className="w-5 h-5 text-green-400" />
                                    Source Attribution
                                </h4>
                            </CardHeader>
                            <CardBody>
                                <div className="space-y-3">
                                    {(summaryData.sources).map((source, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                <div>
                                                    <p className="text-white font-medium">{source.type}</p>
                                                    
                                                    <p className="text-gray-400 text-sm"><a href={source.url}>View Source</a></p>
                                                </div>
                                            </div>
                                            <Chip
                                                color={source.reliability >= 90 ? 'success' : 'warning'}
                                                variant="flat"
                                                size="sm"
                                            >
                                                {source.reliability}% reliable
                                            </Chip>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )}

                {/* Show fallback results if no summaryData but showResult is true */}
                {showResult && !summaryData && (
                    <div className="space-y-6">
                        {/* Book Info & Confidence */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white">The Great Gatsby</h3>
                                    <p className="text-gray-400">by F. Scott Fitzgerald</p>
                                </div>
                                <div className="text-right">
                                    <Chip
                                        color={getConfidenceColor(confidenceScore)}
                                        variant="flat"
                                        size="lg"
                                        startContent={<Shield className="w-4 h-4" />}
                                    >
                                        {getConfidenceLabel(confidenceScore)} ({confidenceScore}%)
                                    </Chip>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Rest of fallback content... */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardBody>
                                <p className="text-gray-300">Summary data not available. Please try again.</p>
                            </CardBody>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}