import React from 'react'
import { useNavigate } from 'react-router-dom'

interface AccessDeniedProps {
  projectExists: boolean
}

export default function AccessDenied({ projectExists }: AccessDeniedProps) {
  const navigate = useNavigate()

  return (
    <div className="w-screen h-screen bg-[#121212] flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            {projectExists ? 'Access Denied' : 'Project Not Found'}
          </h1>

          <p className="text-gray-400 mb-8">
            {projectExists
              ? 'You do not have permission to view this project. Please contact the owner to request access.'
              : 'This project does not exist or has been deleted.'}
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
