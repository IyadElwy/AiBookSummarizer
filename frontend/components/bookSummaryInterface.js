"use client";


import { Input, Button, Select, SelectItem, Progress, Card, CardBody, CardHeader, Chip, Divider } from '@heroui/react';
import { Search, AlertCircle, CheckCircle, BookOpen, Brain, Globe, Zap, Shield, ExternalLink } from 'lucide-react';
import { useState } from 'react';



const languages = [
    { key: 'en', label: 'English' },
    { key: 'de', label: 'Deutsch' },
    { key: 'fr', label: 'Français' },
    { key: 'es', label: 'Español' },
    { key: 'it', label: 'Italiano' }
];

const models = [
    { key: 'gpt4', label: 'GPT-4 (Detailed)' },
    { key: 'claude', label: 'Claude (Balanced)' },
    { key: 'gemini', label: 'Gemini (Fast)' }
];

const mockSources = [
    { type: 'Amazon Reviews', count: 847, reliability: 85 },
    { type: 'Goodreads', count: 1250, reliability: 92 },
    { type: 'Publisher Description', count: 1, reliability: 95 },
    { type: 'Book Excerpts', count: 12, reliability: 98 },
    { type: 'Professional Reviews', count: 23, reliability: 96 }
];


export default function BookSummaryInterface({ session }) {


    const [isbn, setIsbn] = useState('');
    const [language, setLanguage] = useState('en');
    const [model, setModel] = useState('gpt4');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [confidenceScore, setConfidenceScore] = useState(87);

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

    const simulateProgress = async () => {
        const steps = [
            { step: 'Validating ISBN...', duration: 800 },
            { step: 'Fetching book metadata...', duration: 1200 },
            { step: 'Collecting reviews and descriptions...', duration: 2000 },
            { step: 'Cross-referencing sources...', duration: 1500 },
            { step: 'Generating AI summary...', duration: 3000 },
            { step: 'Calculating confidence metrics...', duration: 1000 },
            { step: 'Finalizing results...', duration: 500 }
        ];

        let currentProgress = 0;
        for (let i = 0; i < steps.length; i++) {
            setCurrentStep(steps[i].step);
            const stepProgress = ((i + 1) / steps.length) * 100;

            // Animate progress
            const startProgress = currentProgress;
            const endProgress = stepProgress;
            const duration = steps[i].duration;
            const startTime = Date.now();

            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(elapsed / duration, 1);
                const currentValue = startProgress + (endProgress - startProgress) * progressRatio;

                setProgress(currentValue);

                if (progressRatio < 1) {
                    requestAnimationFrame(animateProgress);
                }
            };

            animateProgress();
            await new Promise(resolve => setTimeout(resolve, duration));
            currentProgress = stepProgress;
        }
    };

    const handleSummarize = async () => {
        if (error || !isbn.trim()) return;

        setIsProcessing(true);
        setShowResult(false);
        setProgress(0);

        await simulateProgress();

        setIsProcessing(false);
        setShowResult(true);
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


    return (<div className="min-h-screen bg-gray-900 p-6">
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

                    {/* Summarize Button */}
                    <Button
                        color="primary"
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onPress={handleSummarize}
                        isDisabled={!!error || !isbn.trim() || isProcessing}
                        startContent={<Zap className="w-5 h-5" />}
                    >
                        {isProcessing ? 'Processing...' : 'Summarize Book'}
                    </Button>
                </CardBody>
            </Card>

            {/* Progress Section */}
            {isProcessing && (
                <Card className="bg-gray-800 border-gray-700">
                    <CardBody className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                            <span className="text-white font-medium">Processing Your Request</span>
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
            {showResult && (
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
                                        <span className="text-white text-sm">92%</span>
                                    </div>
                                    <Progress value={92} color="success" size="sm" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-300 text-sm">Content Coverage</span>
                                        <span className="text-white text-sm">85%</span>
                                    </div>
                                    <Progress value={85} color="warning" size="sm" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-300 text-sm">Cross-Reference</span>
                                        <span className="text-white text-sm">89%</span>
                                    </div>
                                    <Progress value={89} color="primary" size="sm" />
                                </div>
                            </div>

                            <Divider className="bg-gray-600" />

                            <div className="space-y-3">
                                <h5 className="text-white font-medium">Confidence Factors:</h5>
                                <div className="grid grid-cols-2 gap-2">
                                    <Chip color="success" variant="flat" size="sm">High Source Volume</Chip>
                                    <Chip color="success" variant="flat" size="sm">Professional Reviews</Chip>
                                    <Chip color="warning" variant="flat" size="sm">Limited Excerpts</Chip>
                                    <Chip color="success" variant="flat" size="sm">Strong Cross-Reference</Chip>
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
                                <p className="text-gray-300 leading-relaxed">
                                    The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on prosperous Long Island and in New York City during the summer of 1922, the novel follows the tragic story of Jay Gatsby, a mysterious millionaire who throws lavish parties in hopes of winning back his lost love, Daisy Buchanan.
                                </p>
                                <p className="text-gray-300 leading-relaxed mt-4">
                                    The story is narrated by Nick Carraway, Daisy's cousin, who becomes Gatsby's neighbor and witness to his obsessive pursuit. Through themes of wealth, love, idealism, and moral decay, Fitzgerald critiques the American Dream and the excess of the Roaring Twenties.
                                </p>
                                <p className="text-gray-300 leading-relaxed mt-4">
                                    The novel explores the disillusionment of post-World War I America and is considered one of the greatest American novels, known for its beautiful prose and symbolic depth.
                                </p>
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
                                {mockSources.map((source, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                            <div>
                                                <p className="text-white font-medium">{source.type}</p>
                                                <p className="text-gray-400 text-sm">{source.count} sources analyzed</p>
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
        </div>
    </div>)
}