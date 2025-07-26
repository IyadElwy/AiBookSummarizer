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

// Mock data for book history
const mockBookHistory = [
    {
        id: 1,
        isbn: '978-0743273565',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        model: 'GPT-4',
        language: 'English',
        confidenceScore: 87,
        dateProcessed: '2024-01-15',
        processingTime: '12.3s',
        summary: 'The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald. Set in the Jazz Age on prosperous Long Island and in New York City during the summer of 1922, the novel follows the tragic story of Jay Gatsby, a mysterious millionaire who throws lavish parties in hopes of winning back his lost love, Daisy Buchanan. The story is narrated by Nick Carraway, Daisy\'s cousin, who becomes Gatsby\'s neighbor and witness to his obsessive pursuit.',
        sources: [
            { type: 'Amazon Reviews', count: 847, reliability: 85 },
            { type: 'Goodreads', count: 1250, reliability: 92 },
            { type: 'Publisher Description', count: 1, reliability: 95 }
        ],
        confidenceMetrics: {
            sourceReliability: 92,
            contentCoverage: 85,
            crossReference: 89
        }
    },
    {
        id: 2,
        isbn: '978-0061120084',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        model: 'Claude',
        language: 'English',
        confidenceScore: 94,
        dateProcessed: '2024-01-14',
        processingTime: '8.7s',
        summary: 'To Kill a Mockingbird is a novel by Harper Lee published in 1960. The story takes place in the fictional town of Maycomb, Alabama, during the 1930s. It follows Scout Finch, a young girl whose father Atticus is a lawyer defending a Black man falsely accused of rape. The novel explores themes of racial injustice, moral growth, and the loss of innocence.',
        sources: [
            { type: 'Academic Papers', count: 234, reliability: 98 },
            { type: 'Literary Reviews', count: 156, reliability: 94 },
            { type: 'Study Guides', count: 89, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 96,
            contentCoverage: 91,
            crossReference: 95
        }
    },
    {
        id: 3,
        isbn: '978-0451524935',
        title: '1984',
        author: 'George Orwell',
        model: 'Gemini',
        language: 'Deutsch',
        confidenceScore: 76,
        dateProcessed: '2024-01-13',
        processingTime: '6.1s',
        summary: '1984 ist ein dystopischer Roman von George Orwell, der 1949 veröffentlicht wurde. Die Geschichte spielt in einem totalitären Staat namens Ozeanien, wo die Partei unter der Führung des "Großen Bruders" absolute Kontrolle über das Leben der Bürger ausübt. Der Protagonist Winston Smith arbeitet im Ministerium für Wahrheit und beginnt, das System zu hinterfragen.',
        sources: [
            { type: 'Deutsche Reviews', count: 423, reliability: 78 },
            { type: 'Übersetzungen', count: 12, reliability: 85 },
            { type: 'Literaturkritik', count: 67, reliability: 91 }
        ],
        confidenceMetrics: {
            sourceReliability: 82,
            contentCoverage: 74,
            crossReference: 71
        }
    },
    {
        id: 4,
        isbn: '978-0316769488',
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        model: 'GPT-4',
        language: 'English',
        confidenceScore: 91,
        dateProcessed: '2024-01-12',
        processingTime: '15.2s',
        summary: 'The Catcher in the Rye is a novel by J.D. Salinger, first published in 1951. The story follows Holden Caulfield, a teenager who has been expelled from prep school and wanders around New York City for a few days before returning home. The novel explores themes of adolescent alienation, identity crisis, and the phoniness of adult society.',
        sources: [
            { type: 'Literary Analysis', count: 567, reliability: 93 },
            { type: 'Student Reviews', count: 892, reliability: 76 },
            { type: 'Critical Essays', count: 134, reliability: 96 }
        ],
        confidenceMetrics: {
            sourceReliability: 88,
            contentCoverage: 92,
            crossReference: 94
        }
    },
    {
        id: 5,
        isbn: '978-0060935467',
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        model: 'Claude',
        language: 'Español',
        confidenceScore: 83,
        dateProcessed: '2024-01-11',
        processingTime: '11.8s',
        summary: 'Cien años de soledad es una novela del escritor colombiano Gabriel García Márquez, publicada en 1967. La historia narra la saga de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo. La novela es considerada una obra maestra del realismo mágico y una de las novelas más importantes de la literatura latinoamericana.',
        sources: [
            { type: 'Crítica Literaria', count: 345, reliability: 94 },
            { type: 'Reseñas Académicas', count: 178, reliability: 89 },
            { type: 'Análisis Temático', count: 223, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 90,
            contentCoverage: 81,
            crossReference: 78
        }
    },
    {
        id: 6,
        isbn: '978-0060935467',
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        model: 'Claude',
        language: 'Español',
        confidenceScore: 83,
        dateProcessed: '2024-01-11',
        processingTime: '11.8s',
        summary: 'Cien años de soledad es una novela del escritor colombiano Gabriel García Márquez, publicada en 1967. La historia narra la saga de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo. La novela es considerada una obra maestra del realismo mágico y una de las novelas más importantes de la literatura latinoamericana.',
        sources: [
            { type: 'Crítica Literaria', count: 345, reliability: 94 },
            { type: 'Reseñas Académicas', count: 178, reliability: 89 },
            { type: 'Análisis Temático', count: 223, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 90,
            contentCoverage: 81,
            crossReference: 78
        }
    },
    {
        id: 7,
        isbn: '978-0060935467',
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        model: 'Claude',
        language: 'Español',
        confidenceScore: 83,
        dateProcessed: '2024-01-11',
        processingTime: '11.8s',
        summary: 'Cien años de soledad es una novela del escritor colombiano Gabriel García Márquez, publicada en 1967. La historia narra la saga de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo. La novela es considerada una obra maestra del realismo mágico y una de las novelas más importantes de la literatura latinoamericana.',
        sources: [
            { type: 'Crítica Literaria', count: 345, reliability: 94 },
            { type: 'Reseñas Académicas', count: 178, reliability: 89 },
            { type: 'Análisis Temático', count: 223, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 90,
            contentCoverage: 81,
            crossReference: 78
        }
    },
    {
        id: 8,
        isbn: '978-0060935467',
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        model: 'Claude',
        language: 'Español',
        confidenceScore: 83,
        dateProcessed: '2024-01-11',
        processingTime: '11.8s',
        summary: 'Cien años de soledad es una novela del escritor colombiano Gabriel García Márquez, publicada en 1967. La historia narra la saga de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo. La novela es considerada una obra maestra del realismo mágico y una de las novelas más importantes de la literatura latinoamericana.',
        sources: [
            { type: 'Crítica Literaria', count: 345, reliability: 94 },
            { type: 'Reseñas Académicas', count: 178, reliability: 89 },
            { type: 'Análisis Temático', count: 223, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 90,
            contentCoverage: 81,
            crossReference: 78
        }
    },
    {
        id: 9,
        isbn: '978-0060935467',
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        model: 'Claude',
        language: 'Español',
        confidenceScore: 83,
        dateProcessed: '2024-01-11',
        processingTime: '11.8s',
        summary: 'Cien años de soledad es una novela del escritor colombiano Gabriel García Márquez, publicada en 1967. La historia narra la saga de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo. La novela es considerada una obra maestra del realismo mágico y una de las novelas más importantes de la literatura latinoamericana.',
        sources: [
            { type: 'Crítica Literaria', count: 345, reliability: 94 },
            { type: 'Reseñas Académicas', count: 178, reliability: 89 },
            { type: 'Análisis Temático', count: 223, reliability: 87 }
        ],
        confidenceMetrics: {
            sourceReliability: 90,
            contentCoverage: 81,
            crossReference: 78
        }
    }
];

const ITEMS_PER_PAGE = 5;

export default function BookHistoryTable({ session }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedBook, setSelectedBook] = useState(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const totalPages = Math.ceil(mockBookHistory.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = mockBookHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
                                                <p className="text-sm text-gray-400">by {book.author}</p>
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
                                                    <span className="text-xs text-gray-400">{book.language}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <Chip
                                                    color={getConfidenceColor(book.confidenceScore)}
                                                    variant="flat"
                                                    size="sm"
                                                    startContent={<Shield className="w-3 h-3" />}
                                                >
                                                    {getConfidenceLabel(book.confidenceScore)} ({book.confidenceScore}%)
                                                </Chip>
                                                <Progress
                                                    value={book.confidenceScore}
                                                    color={getConfidenceColor(book.confidenceScore)}
                                                    size="sm"
                                                    className="w-16"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    <span className="text-sm">{formatDate(book.dateProcessed)}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">{book.processingTime}</p>
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
                        classNames={{
                            wrapper: "gap-0 overflow-visible h-8 rounded border border-divider",
                            item: "w-8 h-8 text-small rounded-none bg-transparent",
                            cursor: "bg-blue-600 text-white font-bold"
                        }}
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
                                            <p className="text-gray-400">by {selectedBook?.author}</p>
                                        </div>
                                        <Chip
                                            color={getConfidenceColor(selectedBook?.confidenceScore)}
                                            variant="flat"
                                            size="lg"
                                            startContent={<Shield className="w-4 h-4" />}
                                        >
                                            {getConfidenceLabel(selectedBook?.confidenceScore)} ({selectedBook?.confidenceScore}%)
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
                                                    <p className="text-white">{selectedBook.language}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-sm">Processing Time</p>
                                                    <p className="text-white">{selectedBook.processingTime}</p>
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
                                                            <span className="text-white text-sm">{selectedBook.confidenceMetrics.sourceReliability}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.confidenceMetrics.sourceReliability} color="success" size="sm" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300 text-sm">Content Coverage</span>
                                                            <span className="text-white text-sm">{selectedBook.confidenceMetrics.contentCoverage}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.confidenceMetrics.contentCoverage} color="warning" size="sm" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300 text-sm">Cross-Reference</span>
                                                            <span className="text-white text-sm">{selectedBook.confidenceMetrics.crossReference}%</span>
                                                        </div>
                                                        <Progress value={selectedBook.confidenceMetrics.crossReference} color="primary" size="sm" />
                                                    </div>
                                                </div>
                                            </div>

                                            <Divider className="bg-gray-600" />

                                            {/* Summary */}
                                            <div className="space-y-4">
                                                <h4 className="text-lg font-semibold text-white">AI Generated Summary</h4>
                                                <div className="bg-gray-700 p-4 rounded-lg">
                                                    <p className="text-gray-300 leading-relaxed">{selectedBook.summary}</p>
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