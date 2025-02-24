import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, useRef } from "react"
import { toCapitalCase, transformFieldValues } from "@/utils/formatters"
import { generateRandomData, setDummyFile } from "@/utils/mockData"
import { guestFormSchema, type GuestFormData } from "@/lib/schemas/guestFormSchema"
import { defaultFormValues } from "@/constants/guestFormData"
import { addFileToFormData, handleNameInputChange } from "@/utils/helpers"
import { getTodayDate, handleCheckInDateChange } from "@/utils/dates"
import { useSearchParams } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
const apiUrl = import.meta.env.VITE_API_URL;

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validIdInputRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: defaultFormValues,
    mode: "all"
  })

  const today = getTodayDate(); // Replace the existing today declaration

  // Generate new random data on page load only in non-production
  useEffect(() => {
    handleGenerateNewData();
  }, []);

  // Update file input when generating new data
  const handleGenerateNewData = async () => {
    if (isProduction) return;

    const randomData = await generateRandomData();
    form.reset(randomData);
    
    // Set the dummy files in the file inputs
    if (randomData.paymentReceipt) {
      setDummyFile(fileInputRef, randomData.paymentReceipt);
    }
    if (randomData.validId) {
      setDummyFile(validIdInputRef, randomData.validId);
    }
  };

  async function onSubmit(values: GuestFormData) {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    
    try {
      const transformedValues = transformFieldValues(values)
      const formData = new FormData()
      
      // Add all form values to FormData, excluding paymentReceipt and validId
      Object.entries(transformedValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'paymentReceipt' && key !== 'validId') {
          formData.append(key, value.toString());
        }
      });

      // Add additional fixed values
      formData.append('unitOwner', 'Arianna Perez');
      formData.append('towerAndUnitNumber', 'Monaco 2604');
      formData.append('ownerOnsiteContactPerson', 'Arianna Perez');
      formData.append('ownerContactNumber', '0962 541 2941');

      // Add files to form data with validation
      addFileToFormData(formData, 'paymentReceipt');
      addFileToFormData(formData, 'validId');

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      ['generatePdf', 'sendEmail', 'updateGoogleCalendar'].forEach(param => {
        if (searchParams.get(param) === 'true') {
          queryParams.append(param, 'true');
        }
      });

      const apiUrlWithParams = `${apiUrl}/submit-form${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

      const response = await fetch(apiUrlWithParams, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 
          errorData.message || 
          `HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const result = await response.json();
      if (!result.success) {
        const errorMessage = result.error || 
          (result.details?.message) || 
          'Failed to submit form';
        console.error('Form submission failed:', result);
        throw new Error(errorMessage);
      }

      // Reset form and show success message
      if (!isProduction) {
        const newData = await generateRandomData();
        form.reset(newData);
      } else {
        form.reset(defaultFormValues);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSubmitError(null);
      setSubmitSuccess(true);
    } catch (error: unknown) {
      console.error('Error submitting form:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error 
        ? `Error: ${error.message}` 
        : 'An unexpected error occurred. Please try again.';
      setSubmitError(errorMessage);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate total number of additional guests needed, capped at 6
  const totalGuests = (form.watch("numberOfAdults") || 1) + (form.watch("numberOfChildren") || 0)
  const additionalGuestsNeeded = Math.min(3, Math.max(0, totalGuests - 1)) // Cap at 3 additional guests

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {!isProduction && (
          <div className="flex justify-end mb-4">
            <Button type="button" variant="outline" onClick={handleGenerateNewData}>
              Generate New Data
            </Button>
          </div>
        )}

        <FormField
          control={form.control}
          name="guestFacebookName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Facebook Name <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input 
                  placeholder="Your username/full name in Facebook" 
                  {...field} 
                  onChange={(e) => handleNameInputChange(e, field.onChange, toCapitalCase)}
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
              <FormLabel>Guest Email <span className="text-red-500">*</span></FormLabel>
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
              <FormLabel>Guest Phone Number <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input 
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ex. 09876543210"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^\d]/g, '');
                    // Limit to 11 digits
                    const trimmed = value.slice(0, 11);
                    field.onChange(trimmed);
                    
                    // Trigger validation on change
                    form.trigger("guestPhoneNumber");
                  }}
                />
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
              <FormLabel>Guest Address <span className="text-red-500">*</span></FormLabel>
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
                <FormLabel>Check-in Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    min={today}
                    {...field}
                    onChange={(e) => handleCheckInDateChange(e, form)}
                  />
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
                <FormLabel>Check-out Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    min={form.watch('checkInDate') ? form.watch('checkInDate') : today}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      form.trigger("checkOutTime");
                    }}
                  />
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
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-r-none"
                    disabled={field.value <= 1} // Always require at least 1 adult
                    onClick={() => {
                      const newValue = Math.max(1, (field.value || 1) - 1);
                      field.onChange(newValue);
                    }}
                  >
                    -
                  </Button>
                  <FormControl>
                    <Input 
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="1"
                      max="4"
                      readOnly
                      tabIndex={-1}
                      className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pointer-events-none"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-l-none"
                    disabled={field.value >= 4 || totalGuests >= 6} // Max 4 adults or total 6 guests
                    onClick={() => {
                      const currentChildren = form.getValues("numberOfChildren") || 0;
                      const newValue = Math.min(4, (field.value || 1) + 1);
                      if (newValue + currentChildren <= 6) {
                        field.onChange(newValue);
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
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
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-r-none"
                    disabled={field.value <= 0}
                    onClick={() => {
                      const newValue = Math.max(0, (field.value || 0) - 1);
                      field.onChange(newValue);
                    }}
                  >
                    -
                  </Button>
                  <FormControl>
                    <Input 
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      max="5"
                      readOnly
                      tabIndex={-1}
                      className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pointer-events-none"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    color="green"
                    variant="outline"
                    className="px-3 rounded-l-none"
                    disabled={totalGuests >= 6 || field.value >= 5} // Max total 6 guests or 5 children
                    onClick={() => {
                      const currentAdults = form.getValues("numberOfAdults") || 1;
                      const newValue = (field.value || 0) + 1;
                      if (newValue + currentAdults <= 6) {
                        field.onChange(newValue);
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {totalGuests >= 4 && (
          <div className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200" role="alert">
            <div className="flex gap-2 items-start">
              <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="block text-sm sm:inline">
                Please note that Azure North only allows a maximum of 4 pax on the guest form. However, our unit can accommodate up to 4 adults and 2 children. But if you're more than 4 adults, please inform us directly on our Facebook page so that we can accommodate you.
              </span>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="primaryGuestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>1. Primary Guest - Name <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input 
                  placeholder="Complete name of Primary Guest"
                  {...field} 
                  onChange={(e) => handleNameInputChange(e, field.onChange, toCapitalCase)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Additional Guests Fields */}
        {additionalGuestsNeeded > 0 && (
          <div className="space-y-4">
            {Array.from({ length: additionalGuestsNeeded }).map((_, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`guest${index + 2}Name` as keyof GuestFormData}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                     {index + 2}. {
                       index + 2 === 2 ? "Second" :
                       index + 2 === 3 ? "Third" :
                       "Fourth"
                     } Guest - Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={`Complete name of ${
                          index + 2 === 2 ? "Second Guest" :
                          index + 2 === 3 ? "Third Guest" :
                          "Fourth Guest"
                        }`}
                        {...field}
                        value={field.value?.toString() ?? ''}
                        onChange={(e) => handleNameInputChange(e, field.onChange, toCapitalCase)}
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
                <Textarea placeholder="Ex. Late check-in, cash only for balance payment, etc." {...field} />
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
              <FormLabel>How did you find us?</FormLabel>
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
                <FormLabel className="!mt-0">Need Pay Parking?</FormLabel>
              </FormItem>
            )}
          />

          {form.watch("needParking") && (
            <div className="pl-6 space-y-4">
              <div className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200" role="alert">
                <div className="flex flex-col gap-y-4 text-sm">
                  <p className="font-bold">🚙 Azure North Parking Reminder</p>
                  <p>Please note that vehicles without a designated parking slot are allowed to enter for <span className="font-semibold">drop-off only</span> in front of the Tower entrance.</p>
                  <p><span className="font-semibold">FREE parking is available outside Azure North</span> in front of the gate entrance and Home Depot, just 3-5 minutes walk to Azure North Monaco Tower.</p>
                  <p>If you want to reserve a parking slot inside Azure North, please fill up your car details below and pay <span className="font-semibold text-red-600">P400 per night</span>. To ensure hassle-free entry to our unit, we highly recommend booking in advance since parking slots are limited particularly during weekends.</p>
                </div>
              </div>

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

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="validId"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>Valid ID <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file || null);
                    }}
                    className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background ring-offset-background file:border-0 file:font-semibold file:bg-green-50 file:rounded-sm file:text-green-700 hover:file:bg-green-100"
                    {...field}
                    ref={validIdInputRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentReceipt"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>Payment Receipt <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file || null);
                    }}
                    className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background ring-offset-background file:border-0 file:font-semibold file:bg-green-50 file:rounded-sm file:text-green-700 hover:file:bg-green-100"
                    {...field}
                    ref={fileInputRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {submitSuccess && (
          <div className="relative px-4 py-3 mb-4 text-green-700 bg-green-50 rounded border border-green-200" role="alert">
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">Your form has been submitted successfully.</span>
          </div>
        )}

        {submitError && (
          <div className="relative px-4 py-3 mb-4 text-red-700 bg-red-50 rounded border border-red-200" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}>
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="mr-3 -ml-1 w-5 h-5 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit'
          )}
        </Button>
      </form>
    </Form>
  )
}