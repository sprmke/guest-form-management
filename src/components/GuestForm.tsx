import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { formatDate, formatTimeToAMPM, toCapitalCase } from "@/utils/formatters"
import { generateRandomData } from "@/utils/mockData"

export const formSchema = z.object({
  guestFacebookName: z.string().min(2, "Facebook name must be at least 2 characters"),
  primaryGuestName: z.string().min(2, "Full name must be at least 2 characters"),
  guestEmail: z.string().email("Invalid email address"),
  guestPhoneNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  guestAddress: z.string().min(5, "Address must be at least 5 characters"),
  checkInDate: z.string().min(1, "Please select check-in date"),
  checkOutDate: z.string().min(1, "Please select check-out date"),
  guest2Name: z.string().optional(),
  guest3Name: z.string().optional(),
  guest4Name: z.string().optional(),
  guest5Name: z.string().optional(),
  guestSpecialRequests: z.string().optional(),
  findUs: z.string().min(1, "Please select how you found us"),
  findUsDetails: z.string().optional(),
  needParking: z.boolean().default(false),
  carPlateNumber: z.string().optional(),
  carBrandModel: z.string().optional(),
  carColor: z.string().optional(),
  hasPets: z.boolean().default(false),
  petName: z.string().optional(),
  petBreed: z.string().optional(),
  petAge: z.string().optional(),
  petVaccinationDate: z.string().optional(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  nationality: z.string().default("Filipino"),
  numberOfAdults: z.number().min(1),
  numberOfChildren: z.number().min(0),
})

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
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
    // Transform values to capital case before submission
    const transformedValues = {
      ...values,
      guestFacebookName: toCapitalCase(values.guestFacebookName),
      primaryGuestName: toCapitalCase(values.primaryGuestName),
      guestAddress: toCapitalCase(values.guestAddress),
      guest2Name: values.guest2Name ? toCapitalCase(values.guest2Name) : '',
      guest3Name: values.guest3Name ? toCapitalCase(values.guest3Name) : '',
      guest4Name: values.guest4Name ? toCapitalCase(values.guest4Name) : '',
      guest5Name: values.guest5Name ? toCapitalCase(values.guest5Name) : '',
      nationality: toCapitalCase(values.nationality),
      carBrandModel: values.carBrandModel ? toCapitalCase(values.carBrandModel) : '',
      carColor: values.carColor ? toCapitalCase(values.carColor) : '',
      petName: values.petName ? toCapitalCase(values.petName) : '',
      petBreed: values.petBreed ? toCapitalCase(values.petBreed) : '',
      findUsDetails: values.findUsDetails ? toCapitalCase(values.findUsDetails) : '',
      checkInTime: formatTimeToAMPM(values.checkInTime, true),
      checkOutTime: formatTimeToAMPM(values.checkOutTime, false),
      checkInDate: formatDate(values.checkInDate),
      checkOutDate: formatDate(values.checkOutDate),
      petVaccinationDate: values.petVaccinationDate ? formatDate(values.petVaccinationDate) : '',
    }

    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const formData = {
        unitOwner: 'Arianna Perez',
        towerAndUnitNumber: 'Monaco 2604',
        ownerOnsiteContactPerson: 'Arianna Perez',
        ownerContactNumber: '0962 541 2941',
        numberOfNights: Math.ceil((new Date(values.checkOutDate).getTime() - new Date(values.checkInDate).getTime()) / (1000 * 60 * 60 * 24)).toString(),
        ...transformedValues
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
      if (!result.success) {
        const errorMessage = result.error ?? result.details ?? `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      form.reset(generateRandomData())
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

  // Calculate total number of additional guests needed, capped at 4
  const totalGuests = (form.watch("numberOfAdults") || 1) + (form.watch("numberOfChildren") || 0)
  const additionalGuestsNeeded = Math.min(4, Math.max(0, totalGuests - 1)) // Cap at 4 additional guests

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-end mb-4">
          <Button type="button" variant="outline" onClick={() => form.reset(generateRandomData())}>
            Generate New Data
          </Button>
        </div>

        {submitError && (
          <div className="relative px-4 py-3 mb-4 text-red-700 bg-red-50 rounded border border-red-200" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="guestFacebookName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Facebook Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Your username/name in Facebook" 
                  {...field} 
                  onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryGuestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Guest Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Full name of Primary Guest" 
                  {...field} 
                  onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Ex. juandelacruz@gmail.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Phone Number *</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Ex. 0987 654 3210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Address *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="City, Province" 
                  {...field} 
                  onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkInDate"
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
            name="checkInTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    placeholder="02:00 pm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkOutDate"
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

          <FormField
            control={form.control}
            name="checkOutTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    placeholder="11:00 am"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Ex. Filipino" 
                  onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numberOfAdults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Adults</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    {...field}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 1;
                      const validValue = Math.max(1, value);
                      field.onChange(validValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfChildren" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Children</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    {...field}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 0;
                      const validValue = Math.max(0, value);
                      field.onChange(validValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dynamic Additional Guests Fields */}
        {additionalGuestsNeeded > 0 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Additional Guests</label>
            {Array.from({ length: additionalGuestsNeeded }).map((_, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`guest${index + 2}Name` as keyof z.infer<typeof formSchema>}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder={`Guest ${index + 2} Name`} 
                        {...field}
                        value={field.value?.toString() ?? ''}
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}

        <FormField
          control={form.control}
          name="guestSpecialRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special requests / Notes to owner</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex. Late check-in, extra towels, cash payment for balance payment, etc." {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value || "Facebook"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how you found us" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Airbnb">Airbnb</SelectItem>
                  <SelectItem value="Tiktok">Tiktok</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {(form.watch("findUs") === "Friend" || form.watch("findUs") === "Others") && (
          <FormField
            control={form.control}
            name="findUsDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch("findUs") === "Friend" ? "Friend's Name" : "Please specify where you found us"}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder={
                      form.watch("findUs") === "Friend" 
                        ? "Enter your friend's name" 
                        : "Please specify how you found us"
                    } 
                    {...field} 
                    onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="needParking"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Need Parking?</FormLabel>
              </FormItem>
            )}
          />

          {form.watch("needParking") && (
            <div className="pl-6 space-y-4">
              <FormField
                control={form.control}
                name="carPlateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Plate Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. ABC123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carBrandModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Brand & Model</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Honda Civic" 
                        {...field} 
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Color</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Red" 
                        {...field} 
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="hasPets"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Bringing Pets?</FormLabel>
              </FormItem>
            )}
          />

          {form.watch("hasPets") && (
            <div className="pl-6 space-y-4">
              <FormField
                control={form.control}
                name="petName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Max" 
                        {...field} 
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petBreed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Breed</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex. Labrador" 
                        {...field} 
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Age</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. 2 years old" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petVaccinationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Vaccination Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Form>
  )
}