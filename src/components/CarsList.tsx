import React, { useState, useEffect } from 'react'
import { getCars, Car } from '../services/carService'
import AddCarForm from './AddCarForm'

const CarsList: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchCars = async () => {
    setLoading(true)
    setError(null)

    const result = await getCars()
    if (result.success) {
      setCars(result.cars || [])
    } else {
      setError(result.error || 'Failed to load cars')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCars()
  }, [])

  const handleCarAdded = () => {
    fetchCars() // Refresh the list
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          onClick={fetchCars}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cars</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Car
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cars found. Add your first car!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AddCarForm
            onCarAdded={handleCarAdded}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      )}
    </div>
  )
}

interface CarCardProps {
  car: Car
}

const CarCard: React.FC<CarCardProps> = ({ car }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'rented':
        return 'bg-red-100 text-red-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {car.image_url ? (
        <img
          src={car.image_url}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
          <span className="text-gray-400 text-sm">No image</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-800">
            {car.brand} {car.model}
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
            {car.status}
          </span>
        </div>

        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="font-medium">Year:</span> {car.year}</p>
          <p><span className="font-medium">Plate:</span> {car.plate_number}</p>
          <p><span className="font-medium">Price:</span> ${car.price_per_day}/day</p>
        </div>
      </div>
    </div>
  )
}

export default CarsList