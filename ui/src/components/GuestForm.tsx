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
import { addFileToFormData } from "@/utils/helpers"

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
const apiUrl = import.meta.env.VITE_API_URL;

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validIdInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: defaultFormValues
  })

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
      // Transform values to format fields before submission
      const transformedValues = transformFieldValues(values);
      
      const formData = new FormData();
      
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

      const response = await fetch(`${apiUrl}/submit-form`, {
        method: 'POST',
        body: formData
      });

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

  // Calculate total number of additional guests needed, capped at 4
  const totalGuests = (form.watch("numberOfAdults") || 1) + (form.watch("numberOfChildren") || 0)
  const additionalGuestsNeeded = Math.min(4, Math.max(0, totalGuests - 1)) // Cap at 4 additional guests

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
              <FormLabel>Guest Facebook Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Your username/full name in Facebook" 
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
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-r-none"
                    onClick={() => {
                      const newValue = Math.max(1, Math.min(4, (parseInt((field as any).value as string) || 1) - 1));
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
                      className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...field}
                      onChange={e => {
                        const value = e.target.value === '' ? '1' : e.target.value;
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          field.onChange(Math.max(1, Math.min(4, numValue)));
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-l-none"
                    onClick={() => {
                      const newValue = Math.min(4, (parseInt((field as any).value as string) || 1) + 1);
                      field.onChange(newValue);
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
                    onClick={() => {
                      const newValue = Math.max(0, Math.min(4, (parseInt((field as any).value as string) || 0) - 1));
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
                      max="4"
                      className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      {...field}
                      onChange={e => {
                        const value = e.target.value === '' ? '0' : e.target.value;
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          field.onChange(Math.max(0, Math.min(4, numValue)));
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 rounded-l-none"
                    onClick={() => {
                      const newValue = Math.min(4, (parseInt((field as any).value as string) || 0) + 1);
                      field.onChange(newValue);
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

        {/* Dynamic Additional Guests Fields */}
        {additionalGuestsNeeded > 0 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Additional Guests *</label>
            {Array.from({ length: additionalGuestsNeeded }).map((_, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`guest${index + 2}Name` as keyof GuestFormData}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder={`Guest ${index + 2} - Full Name (Required)`} 
                        {...field}
                        value={field.value?.toString() ?? ''}
                        onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                        required
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
                <FormLabel>Valid ID *</FormLabel>
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
                <FormLabel>Payment Receipt *</FormLabel>
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