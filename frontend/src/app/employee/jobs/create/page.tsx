'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import api, { JobRole } from '@/lib/api'
import { Loader2, Wand2, Plus, Trash2, ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Zod Schema
const jobFormSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    department: z.string().min(2, "Department is required"),
    employment_type: z.string().min(1, "Employment type is required"),
    work_mode: z.string().min(1, "Work mode is required"),
    location: z.string().min(2, "Location is required"),
    salary_min: z.coerce.number().optional(),
    salary_max: z.coerce.number().optional(),

    description: z.string().min(10, "Description must be detailed"),
    key_business_objective: z.string().optional(),

    responsibilities: z.array(z.object({
        content: z.string().min(5, "Responsibility details required"),
        importance: z.enum(["Low", "Medium", "High"])
    })).min(1, "Add at least one responsibility"),

    skills: z.array(z.object({
        skill_name: z.string().min(1, "Skill name required"),
        min_years: z.coerce.number().min(0),
        is_mandatory: z.boolean().default(true)
    })).min(1, "Add at least one skill"),

    min_experience: z.coerce.number().min(0, "Experience cannot be negative"),

    is_english_required: z.boolean().default(false),
    is_coding_required: z.boolean().default(false),
    is_technical_required: z.boolean().default(false),
    assessment_duration: z.coerce.number().min(5, "Minimum 5 minutes").max(180, "Maximum 3 hours").default(15),

    technical_questions: z.array(z.object({
        question: z.string().min(5),
        desired_answer: z.string().min(2)
    })).optional(),

    requirements: z.string().optional() // Requirements summary is optional now, generated or legacy
})

type JobFormValues = z.infer<typeof jobFormSchema>

export default function CreateJobPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('id')

    const [activeStep, setActiveStep] = useState('basics')
    const [generating, setGenerating] = useState<string | null>(null)

    // Form
    const form = useForm<JobFormValues>({
        resolver: zodResolver(jobFormSchema),
        defaultValues: {
            title: '',
            department: '',
            employment_type: 'Full-time',
            work_mode: 'On-site',
            location: '',
            salary_min: 0,
            salary_max: 0,
            description: '',
            key_business_objective: '',
            responsibilities: [],
            skills: [],
            min_experience: 0,
            is_english_required: false,
            is_coding_required: false,
            is_technical_required: false,
            assessment_duration: 15,
            technical_questions: [],
            requirements: ''
        }
    })

    // Watch technical requirement to dynamically update steps
    const isTechnicalRequired = form.watch('is_technical_required')

    // Define steps inside component to react to state
    const steps = [
        { id: 'basics', title: 'Basic Details' },
        { id: 'role', title: 'Role Overview' },
        { id: 'responsibilities', title: 'Responsibilities' },
        { id: 'skills', title: 'Skills & Assessments' }, // Renamed
        ...(isTechnicalRequired ? [{ id: 'technical', title: 'Technical Questions' }] : []) // Conditional Step
    ]

    // Fetch existing job if editing
    const { data: existingJob, isLoading: loadingJob } = useQuery({
        queryKey: ['employee-job', editId],
        queryFn: () => api.get(`/api/employee/jobs/${editId}`),
        enabled: !!editId,
    })

    // Populate form on load
    useEffect(() => {
        if (existingJob) {
            form.reset({
                ...existingJob,
                salary_min: existingJob.salary_min || 0,
                salary_max: existingJob.salary_max || 0,
                responsibilities: existingJob.responsibilities || [],
                skills: existingJob.skills || [],
                skills: existingJob.skills || [],
                technical_questions: existingJob.technical_questions || [],
                assessment_duration: existingJob.assessment_duration || 15
            })
        }
    }, [existingJob, form])

    // Field Arrays
    const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({
        control: form.control,
        name: "responsibilities"
    })

    const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
        control: form.control,
        name: "skills"
    })

    const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control: form.control,
        name: "technical_questions"
    })

    // Mutations
    const mutation = useMutation({
        mutationFn: async (data: JobFormValues) => {
            // Ensure generated summary if empty? Or backend handles it.
            // Just pass data
            if (editId) {
                return api.patch(`/api/employee/jobs/${editId}`, data)
            } else {
                return api.post('/api/employee/jobs', data)
            }
        },
        onSuccess: () => {
            toast.success(editId ? "Job updated successfully" : "Job created successfully")
            router.push('/employee/jobs')
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to save job")
        }
    })

    const aiMutation = useMutation({
        mutationFn: async ({ field, context }: { field: string, context: string }) => {
            return api.post('/api/employee/generate', { field_name: field, context })
        },
        onSuccess: (data: any, variables) => {
            if (variables.field === 'description') {
                form.setValue('description', data.content)
            } else if (variables.field === 'key_business_objective') {
                form.setValue('key_business_objective', data.content)
            } else if (variables.field === 'technical_questions') {
                if (data.technical_questions && Array.isArray(data.technical_questions)) {
                    const newQs = data.technical_questions.map((q: any) => ({
                        question: q.question,
                        desired_answer: q.desired_answer
                    }))
                    const current = form.getValues('technical_questions') || []
                    form.setValue('technical_questions', [...current, ...newQs])
                    toast.success("Generated 5 technical questions")
                }
            } else if (variables.field === 'responsibilities') {
                if (data.content) {
                    const lines = data.content.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().match(/^\d+\./))
                    const newResps = lines.map((l: string) => ({
                        content: l.replace(/^[-*•\d+.]\s*/, '').trim(),
                        importance: 'Medium' as "Medium"
                    }))

                    if (newResps.length > 0) {
                        const current = form.getValues('responsibilities') || []
                        form.setValue('responsibilities', [...current, ...newResps])
                    } else {
                        appendResp({ content: data.content, importance: 'Medium' })
                    }
                }
            } else if (variables.field === 'requirements') {
                form.setValue('requirements', data.content)
            }
        },
        onError: () => toast.error("Failed to generate content")
    })

    const handleGenerate = async (field: string, extraContext?: string) => {
        const title = form.getValues('title')
        if (!title) {
            toast.error("Please enter a Job Title first")
            return
        }
        setGenerating(field)
        // Check if we need to append extra context
        let contextToSend = title;
        if (field === 'technical_questions' && extraContext) {
            contextToSend = `${title} | ${extraContext}`
        }

        await aiMutation.mutateAsync({ field, context: contextToSend })
        setGenerating(null)
    }

    const onSubmit = (data: JobFormValues) => {
        mutation.mutate(data)
    }

    if (loadingJob) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>

    const onInvalid = (errors: any) => {
        console.error("Form Errors:", errors)
        const missingFields = Object.keys(errors).join(", ")
        toast.error(`Please fix errors: ${missingFields}`)

        if (errors.title || errors.department || errors.location) setActiveStep('basics')
        else if (errors.description) setActiveStep('role')
        else if (errors.responsibilities) setActiveStep('responsibilities')
        else if (errors.skills || errors.is_technical_required) setActiveStep('skills')
        else if (errors.technical_questions) setActiveStep('technical')
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{editId ? 'Edit Job Role' : 'Create New Job Role'}</h1>
                    <p className="text-muted-foreground">Follow the steps to define the job details.</p>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Steps Sidebar */}
                <div className="w-64 shrink-0 hidden md:block">
                    <Card>
                        <CardContent className="p-4 space-y-1">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => setActiveStep(step.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-between",
                                        activeStep === step.id
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    <span>{step.title}</span>
                                    {activeStep === step.id && <CheckCircle className="h-4 w-4" />}
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Form Content */}
                <div className="flex-1">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">

                            {/* Basics */}
                            <div className={cn("space-y-6", activeStep === 'basics' ? 'block' : 'hidden')}>
                                <Card>
                                    <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                                    <CardContent className="grid md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="title" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Job Title *</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="department" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Department *</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="employment_type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Employment Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                                        <SelectItem value="Part-time">Part-time</SelectItem>
                                                        <SelectItem value="Contract">Contract</SelectItem>
                                                        <SelectItem value="Internship">Internship</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="work_mode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Work Mode</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="On-site">On-site</SelectItem>
                                                        <SelectItem value="Remote">Remote</SelectItem>
                                                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="location" render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Location *</FormLabel>
                                                <FormControl><Input {...field} placeholder="e.g. New York, NY" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="salary_min" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Min Salary</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="salary_max" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Salary</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                    <CardFooter className="justify-end">
                                        <Button type="button" onClick={() => setActiveStep('role')}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Role Overview */}
                            <div className={cn("space-y-6", activeStep === 'role' ? 'block' : 'hidden')}>
                                <Card>
                                    <CardHeader><CardTitle>Role Overview</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="key_business_objective" render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center">
                                                    <FormLabel>Key Business Objective</FormLabel>
                                                    <Button type="button" variant="ghost" size="sm" className="text-purple-600" onClick={() => handleGenerate('key_business_objective')} disabled={!!generating}>
                                                        {generating === 'key_business_objective' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                        Generate with AI
                                                    </Button>
                                                </div>
                                                <FormControl><Input {...field} placeholder="e.g. Drive revenue growth..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="description" render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center">
                                                    <FormLabel>Role Description *</FormLabel>
                                                    <Button type="button" variant="ghost" size="sm" className="text-purple-600" onClick={() => handleGenerate('description')} disabled={!!generating}>
                                                        {generating === 'description' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                        Generate with AI
                                                    </Button>
                                                </div>
                                                <FormControl><Textarea {...field} rows={8} placeholder="Detailed role description..." /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                    <CardFooter className="justify-between">
                                        <Button type="button" variant="outline" onClick={() => setActiveStep('basics')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                        <Button type="button" onClick={() => setActiveStep('responsibilities')}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Responsibilities */}
                            <div className={cn("space-y-6", activeStep === 'responsibilities' ? 'block' : 'hidden')}>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Responsibilities</CardTitle>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => handleGenerate('responsibilities')} disabled={!!generating} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                                                {generating === 'responsibilities' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                Suggest Responsibilities
                                            </Button>
                                            <Button type="button" size="sm" onClick={() => appendResp({ content: "", importance: "Medium" })}>
                                                <Plus className="h-4 w-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {respFields.map((field, index) => (
                                            <div key={field.id} className="flex gap-4 items-start p-3 bg-muted/20 rounded-lg group">
                                                <div className="flex-1 space-y-2">
                                                    <FormField control={form.control} name={`responsibilities.${index}.content`} render={({ field }) => (
                                                        <Input {...field} placeholder="Responsibility detail..." />
                                                    )} />
                                                </div>
                                                <div className="w-32">
                                                    <FormField control={form.control} name={`responsibilities.${index}.importance`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Low">Low</SelectItem>
                                                                <SelectItem value="Medium">Medium</SelectItem>
                                                                <SelectItem value="High">High</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeResp(index)} className="text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {respFields.length === 0 && <p className="text-center text-muted-foreground py-4">No responsibilities added yet.</p>}
                                    </CardContent>
                                    <CardFooter className="justify-between">
                                        <Button type="button" variant="outline" onClick={() => setActiveStep('role')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                        <Button type="button" onClick={() => setActiveStep('skills')}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Skills & Assessments */}
                            <div className={cn("space-y-6", activeStep === 'skills' ? 'block' : 'hidden')}>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Required Skills & Experience</CardTitle>
                                        <Button type="button" size="sm" onClick={() => appendSkill({ skill_name: "", min_years: 1, is_mandatory: true })}>
                                            <Plus className="h-4 w-4 mr-1" /> Add Skill
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-6">

                                        <FormField control={form.control} name="min_experience" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Minimum Total Experience (Years)</FormLabel>
                                                <FormControl><Input type="number" {...field} className="max-w-[200px]" /></FormControl>
                                            </FormItem>
                                        )} />

                                        <div className="space-y-2">
                                            <FormLabel>Specific Skills</FormLabel>
                                            {skillFields.map((field, index) => (
                                                <div key={field.id} className="flex gap-4 items-center p-3 bg-muted/20 rounded-lg">
                                                    <div className="flex-1">
                                                        <FormField control={form.control} name={`skills.${index}.skill_name`} render={({ field }) => (
                                                            <Input {...field} placeholder="Skill name (e.g. React.js)" />
                                                        )} />
                                                    </div>
                                                    <div className="w-24">
                                                        <FormField control={form.control} name={`skills.${index}.min_years`} render={({ field }) => (
                                                            <Input type="number" {...field} placeholder="Years" />
                                                        )} />
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <FormField control={form.control} name={`skills.${index}.is_mandatory`} render={({ field }) => (
                                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                        )} />
                                                        <span className="text-sm">Mandatory</span>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSkill(index)} className="text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {skillFields.length === 0 && <p className="text-center text-muted-foreground py-4">No specific skills added yet.</p>}
                                        </div>

                                        <FormField control={form.control} name="requirements" render={({ field }) => (
                                            <FormItem>
                                                <div className="flex justify-between items-center">
                                                    <FormLabel>Requirements Summary</FormLabel>
                                                    <Button type="button" variant="ghost" size="sm" className="text-purple-600" onClick={() => handleGenerate('requirements')} disabled={!!generating}>
                                                        {generating === 'requirements' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                        Generate with AI
                                                    </Button>
                                                </div>
                                                <FormControl><Textarea {...field} placeholder="Summary of requirements..." rows={5} /></FormControl>
                                            </FormItem>
                                        )} />

                                        <div className="pt-6 border-t mt-6">
                                            <h4 className="text-lg font-medium mb-4">Assessment Settings</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                                    <div>
                                                        <h4 className="font-medium">English Assessment</h4>
                                                        <p className="text-sm text-muted-foreground">Require candidates to pass an English proficiency test.</p>
                                                    </div>
                                                    <FormField control={form.control} name="is_english_required" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                                    <div>
                                                        <h4 className="font-medium">Coding Test</h4>
                                                        <p className="text-sm text-muted-foreground">Require candidates to pass a practical coding challenge.</p>
                                                    </div>
                                                    <FormField control={form.control} name="is_coding_required" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-100">
                                                    <div>
                                                        <h4 className="font-medium text-blue-900">Technical Assessment</h4>
                                                        <p className="text-sm text-blue-700">Require custom technical questions. Enabling this adds a new step.</p>
                                                    </div>
                                                    <FormField control={form.control} name="is_technical_required" render={({ field }) => (
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    )} />
                                                </div>

                                                {/* Assessment Duration */}
                                                {form.watch('is_technical_required') && (
                                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50 border-purple-100">
                                                        <div>
                                                            <h4 className="font-medium text-purple-900">Assessment Duration (Minutes)</h4>
                                                            <p className="text-sm text-purple-700">Set the time limit for the technical assessment.</p>
                                                        </div>
                                                        <FormField control={form.control} name="assessment_duration" render={({ field }) => (
                                                            <Input
                                                                type="number"
                                                                {...field}
                                                                className="w-24 bg-white"
                                                                min={5}
                                                                max={180}
                                                            />
                                                        )} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </CardContent>
                                    <CardFooter className="justify-between">
                                        <Button type="button" variant="outline" onClick={() => setActiveStep('responsibilities')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>

                                        {/* If Technical is required, show Next; otherwise show Save */}
                                        {isTechnicalRequired ? (
                                            <Button type="button" onClick={() => setActiveStep('technical')}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                        ) : (
                                            <Button type="submit" disabled={mutation.isPending}>
                                                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                {editId ? 'Update Job Role' : 'Create Job Role'} <Save className="ml-2 h-4 w-4" />
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </div>

                            {/* Technical Questions (Conditional) */}
                            {isTechnicalRequired && (
                                <div className={cn("space-y-6", activeStep === 'technical' ? 'block' : 'hidden')}>
                                    <Card className="border-purple-100 shadow-md">
                                        <CardHeader className="flex flex-col gap-4 bg-purple-50/50 pb-4">
                                            <div className="flex flex-row items-center justify-between w-full">
                                                <div>
                                                    <CardTitle className="text-purple-900">Technical Questions</CardTitle>
                                                    <CardDescription>Define specific questions for the candidate to answer.</CardDescription>
                                                </div>
                                            </div>

                                            <div className="flex items-end gap-3 bg-white p-3 rounded-md border border-purple-100">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-xs font-medium text-muted-foreground">AI Generation Focus (Optional)</label>
                                                    <Input
                                                        id="tech-focus"
                                                        placeholder="e.g. 'Advanced Async/Await', 'System Design', 'React Hooks'"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        const focusInput = document.getElementById('tech-focus') as HTMLInputElement;
                                                        handleGenerate('technical_questions', focusInput?.value || '');
                                                    }}
                                                    disabled={!!generating}
                                                    className="bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 h-9"
                                                >
                                                    {generating === 'technical_questions' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                                                    Generate Questions
                                                </Button>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Button type="button" size="sm" onClick={() => appendQuestion({ question: "", desired_answer: "" })}>
                                                    <Plus className="h-4 w-4 mr-1" /> Add Manual Question
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            {questionFields.map((field, index) => (
                                                <div key={field.id} className="grid gap-3 p-4 bg-muted/20 rounded-lg border">
                                                    <div className="flex gap-3 items-start">
                                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mt-1">
                                                            {index + 1}
                                                        </span>
                                                        <div className="flex-1 space-y-3">
                                                            <FormField control={form.control} name={`technical_questions.${index}.question`} render={({ field }) => (
                                                                <div className="space-y-1">
                                                                    <FormLabel className="text-xs text-muted-foreground">Question</FormLabel>
                                                                    <Input {...field} placeholder="e.g. Explain the difference between..." className="bg-white" />
                                                                </div>
                                                            )} />
                                                            <FormField control={form.control} name={`technical_questions.${index}.desired_answer`} render={({ field }) => (
                                                                <div className="space-y-1">
                                                                    <FormLabel className="text-xs text-muted-foreground">Desired Answer / Keywords</FormLabel>
                                                                    <Textarea {...field} placeholder="Key points to look for..." rows={2} className="bg-white" />
                                                                </div>
                                                            )} />
                                                        </div>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(index)} className="text-muted-foreground hover:text-destructive -mt-1">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {questionFields.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                                    <Wand2 className="h-8 w-8 mx-auto mb-2 text-purple-300" />
                                                    <p>No questions added yet.</p>
                                                    <p className="text-sm">Click "Generate Questions" to get started instantly.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="justify-between bg-purple-50/20">
                                            <Button type="button" variant="ghost" onClick={() => setActiveStep('skills')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                                            <Button type="submit" disabled={mutation.isPending} size="lg">
                                                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                {editId ? 'Update Job Role' : 'Create Job Role'} <Save className="ml-2 h-4 w-4" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </div>
                            )}

                        </form>
                    </Form>
                </div>
            </div>
        </div >
    )
}
