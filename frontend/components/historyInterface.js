"use client";

import { useState } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Card, CardBody, CardHeader, Chip, Button, Pagination,
    Progress, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    useDisclosure
} from '@heroui/react';
import {
    BookOpen, Brain, Globe, Calendar, Eye, Shield, Link,
    ChevronDown, ChevronUp, Search, Filter
} from 'lucide-react';



const languages = {
    'en': 'English',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano' 
};



const ITEMS_PER_PAGE = 5;

export default function BookHistoryTable({ session, summary_history_data }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBook, setSelectedBook] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const totalPages = Math.ceil(summary_history_data.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = summary_history_data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const getConfidenceColor = (score) => {
        if (score >= 90) return 'success';
        if (score >= 75) return 'warning';
        return 'danger';
    };

    const getConfidenceLabel = (score) => {
        if (score >= 90) return 'High';
        if (score >= 75) return 'Medium';
        return 'Low';
    };

    const getModelColor = (model) => {
        switch (model) {
            case 'GPT-4': return 'primary';
            case 'Claude': return 'secondary';
            case 'Gemini': return 'warning';
            default: return 'default';
        }
    };

    const handleRowClick = (book) => {
        setSelectedBook(book);
        onOpen();
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-blue-400" />
                            Summary History
                        </h1>
                        <p className="text-gray-400 mt-1">View and manage your book summaries</p>
                    </div>

                </div>

                {/* Main Table */}
                <Card className="bg-gray-800 border-gray-700">
                    <CardBody className="p-0">
                        <Table
                            aria-label="Book summary history table"
                            classNames={{
                                wrapper: "bg-transparent",
                                th: "bg-gray-700 text-white font-semibold",
                                td: "text-gray-300 border-b border-gray-700",
                                tr: "hover:bg-gray-700 cursor-pointer transition-colors"
                            }}
                            selectionMode="none"
                        >
                            <TableHeader>
                                <TableColumn>BOOK DETAILS</TableColumn>
                                <TableColumn>MODEL & LANGUAGE</TableColumn>
                                <TableColumn>CONFIDENCE</TableColumn>
                                <TableColumn>PROCESSED</TableColumn>
                                <TableColumn>ACTIONS</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {currentItems.map((book) => (
                                    <TableRow
                                        key={book.id}
                                        onClick={() => handleRowClick(book)}
                                    >
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-white">{book.title}</p>
                                                <p className="text-sm text-gray-400">by {book.authors.join(", ")}</p>
                                                <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <Chip
                                                    color={getModelColor(book.model)}
                                                    variant="flat"
                                                    size="sm"
                                                    startContent={<Brain className="w-3 h-3" />}
                                                >
                                                    {book.model}
                                                </Chip>
                                                <div className="flex items-center gap-1">
                                                    <Globe className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-400">{languages[book.language]}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <Chip
                                                    color={getConfidenceColor(book.medium_confidence)}
                                                    variant="flat"
                                                    size="sm"
                                                    startContent={<Shield className="w-3 h-3" />}
                                                >
                                                    {getConfidenceLabel(book.medium_confidence)} ({book.medium_confidence}%)
                                                </Chip>
                                                <Progress
                                                    value={book.medium_confidence}
                                                    color={getConfidenceColor(book.medium_confidence)}
                                                    size="sm"
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    <span className="text-sm">{formatDate(book.creation_date)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="light"
                                                size="sm"
                                                className="text-blue-400"
                                                startContent={<Eye className="w-4 h-4" />}
                                                onPress={() => handleRowClick(book)}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardBody>
                </Card>

                {/* Pagination */}
                <div className="flex justify-center">
                    <Pagination
                        total={totalPages}
                        page={currentPage}
                        onChange={setCurrentPage}
                    />
                </div>

                {/* Detail Modal */}
                <Modal
                    isOpen={isOpen}
                    onClose={onClose}
                    size="5xl"
                    scrollBehavior="inside"
                    classNames={{
                        backdrop: "bg-black/80",
                        base: "bg-gray-800 border border-gray-700",
                        header: "border-b border-gray-700",
                        body: "py-6",
                        footer: "border-t border-gray-700"
                    }}
                >
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between w-full">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{selectedBook?.title}</h3>
                                            <p className="text-gray-400">by {selectedBook?.authors.join(", ")}</p>
                                        </div>
                                        <Chip
                                            color={getConfidenceColor(selectedBook?.medium_confidence)}
                                            variant="flat"
                                            size="lg"
                                            startContent={<Shield className="w-4 h-4" />}
                                        >
                                            {getConfidenceLabel(selectedBook?.medium_confidence)} ({selectedBook?.medium_confidence}%)
                                        </Chip>
                                    </div>
                                </ModalHeader>
                                <ModalBody>
                                    {selectedBook && (
                                        <div className="space-y-6">
                                            {/* Book Info */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-gray-400 text-sm">ISBN</p>
                                                    <p className="text-white font-mono text-sm">{selectedBook.isbn}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Model</p>
                                                    <Chip color={getModelColor(selectedBook.model)} variant="flat" size="sm">
                                                        {selectedBook.model}
                                                    </Chip>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Language</p>
                                                    <p className="text-white">{languages[selectedBook.language]}</p>
                                                </div>
                                            </div>

                                            <Divider className="bg-gray-600" />

                                            {/* AI Confidence Metrics */}
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <Brain className="w-5 h-5 text-purple-400" />
                                                    AI Confidence Metrics
                                                </h4>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300 text-sm">Source Reliability</span>
                                                            <span className="text-white text-sm">{selectedBook.source_reliability}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.source_reliability} color="success" size="sm" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300 text-sm">Content Coverage</span>
                                                            <span className="text-white text-sm">{selectedBook.content_coverage}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.content_coverage} color="warning" size="sm" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300 text-sm">Cross-Reference</span>
                                                            <span className="text-white text-sm">{selectedBook.cross_reference}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.cross_reference} color="primary" size="sm" />
                                                    </div>
                                                </div>
                                            </div>

                                            <Divider className="bg-gray-600" />

                                            {/* Summary */}
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-semibold text-white">AI Generated Summary</h4>
                                                <div className="bg-gray-700 p-4 rounded-lg">
                                                    <p className="text-gray-300 leading-relaxed">{selectedBook.generated_summary}</p>
                                                </div>
                                            </div>

                                            <Divider className="bg-gray-600" />

                                            {/* Source Attribution */}
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <Link className="w-5 h-5 text-green-400" />
                                                    Source Attribution
                                                </h4>
                                                <div className="space-y-3">
                                                    {selectedBook.sources.map((source, index) => (
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
                                            </div>
                                        </div>
                                    )}
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="danger" variant="light" onPress={onClose}>
                                        Close
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            </div>
        </div>
    );
}