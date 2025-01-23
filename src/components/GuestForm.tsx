import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"

const formSchema = z.object({
  facebookName: z.string().min(2, "Facebook name must be at least 2 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  contactNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  checkIn: z.string().min(1, "Please select check-in date"),
  checkOut: z.string().min(1, "Please select check-out date"),
  otherGuests: z.array(z.string()).optional(),
  requests: z.string().optional(),
  findUs: z.string().min(1, "Please select how you found us"),
  needParking: z.boolean().default(false),
  hasPets: z.boolean().default(false),
})

const generateRandomData = () => {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
  const streets = ['Main St', 'Oak Ave', 'Maple Rd', 'Cedar Ln', 'Pine Dr', 'Elm St', 'Park Ave']
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']
  const findUsSources = ['Facebook', 'Instagram', 'Friend', 'Google', 'Other']
  const requests = [
    'Early check-in if possible',
    'Late check-out needed',
    'Extra towels please',
    'Ground floor preferred',
    'Quiet room requested',
    ''
  ]

  const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
  const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)
  
  const firstName = randomElement(firstNames)
  const lastName = randomElement(lastNames)
  const fullName = `${firstName} ${lastName}`
  
  // Generate a date between today and next 30 days for check-in
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + randomNumber(1, 30))
  const checkIn = futureDate.toISOString().split('T')[0]
  
  // Generate check-out date 1-7 days after check-in
  const checkOutDate = new Date(futureDate)
  checkOutDate.setDate(futureDate.getDate() + randomNumber(1, 7))
  const checkOut = checkOutDate.toISOString().split('T')[0]

  return {
    facebookName: `${fullName} FB`,
    fullName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    contactNumber: `${randomNumber(100, 999)}${randomNumber(100, 999)}${randomNumber(1000, 9999)}`,
    address: `${randomNumber(1, 999)} ${randomElement(streets)}, ${randomElement(cities)}`,
    checkIn,
    checkOut,
    otherGuests: [],
    requests: randomElement(requests),
    findUs: randomElement(findUsSources),
    needParking: Math.random() > 0.5,
    hasPets: Math.random() > 0.5,
  }
}

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [otherGuests, setOtherGuests] = useState<string[]>([''])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: generateRandomData()
  })

  // Generate new random data on page load
  useEffect(() => {
    form.reset(generateRandomData())
  }, [])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const formData = {
        facebook_name: values.facebookName,
        full_name: values.fullName,
        email: values.email,
        contact_number: values.contactNumber,
        address: values.address,
        check_in_out: `${values.checkIn} to ${values.checkOut}`,
        other_guests: otherGuests.filter(guest => guest.trim() !== ''),
        requests: values.requests || '',
        find_us: values.findUs,
        need_parking: values.needParking,
        has_pets: values.hasPets
      }

      const apiUrl = import.meta.env.VITE_API_URL

      const response = await fetch(`${apiUrl}/api/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (!result.ok || !result.success) {
        const errorMessage = result.error || result.details || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      form.reset(generateRandomData())
      setOtherGuests([''])
      setSubmitError(null)
      alert('Form submitted successfully!')
    } catch (error) {
      console.error('Error submitting form:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addGuestField = () => {
    setOtherGuests([...otherGuests, ''])
  }

  const handleGenerateNewData = () => {
    form.reset(generateRandomData())
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-end mb-4">
          <Button type="button" variant="outline" onClick={handleGenerateNewData}>
            Generate New Data
          </Button>
        </div>

        {submitError && (
          <div className="relative px-4 py-3 mb-4 text-red-700 border border-red-200 rounded bg-red-50" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="facebookName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facebook Name *</FormLabel>
              <FormControl>
                <Input placeholder="Your Facebook name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number *</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Your contact number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Input placeholder="Your address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium">Additional Guests</label>
          {otherGuests.map((guest, index) => (
            <Input
              key={index}
              placeholder={`Guest ${index + 1}`}
              value={guest}
              onChange={(e) => {
                const newGuests = [...otherGuests]
                newGuests[index] = e.target.value
                setOtherGuests(newGuests)
              }}
            />
          ))}
          <Button type="button" variant="outline" onClick={addGuestField}>
            Add more guests
          </Button>
        </div>

        <FormField
          control={form.control}
          name="requests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requests</FormLabel>
              <FormControl>
                <Textarea placeholder="Any special requests or notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="findUs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you find us? *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how you found us" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="needParking"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Need Parking?</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hasPets"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Bringing Pets?</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Form>
  )
}