import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { User } from 'firebase/auth';

interface AdminPageProps {
  user: User;
}

const AdminPage: React.FC<AdminPageProps> = ({ user }) => {
  const navigate = useNavigate();
  
  return (
    <div className="h-screen w-full bg-[#050507]">
      <AdminDashboard 
        isOpen={true} 
        onClose={() => navigate('/dashboard')} 
        onReset={() => {}} 
        currentUserUid={user.uid} 
      />
    </div>
  );
};

export default AdminPage;
