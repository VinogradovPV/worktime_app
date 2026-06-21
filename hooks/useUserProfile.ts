import { useState, useEffect } from "react";
import {
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  getOrganizationStructure,
  addDepartment,
  removeDepartment,
  addInspection,
  removeInspection,
  getInspectionsByDepartment,
  type UserProfile,
  type OrganizationStructure,
  type Department,
  type Inspection,
} from "@/lib/storage/userProfileStorage";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [structure, setStructure] = useState<OrganizationStructure>({ departments: [], inspections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userProfile, orgStructure] = await Promise.all([
        getUserProfile(),
        getOrganizationStructure(),
      ]);

      setProfile(userProfile);
      setStructure(orgStructure);
      setError(null);
    } catch (err) {
      console.error("Ошибка при загрузке профиля:", err);
      setError("Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await updateUserProfile(updates);
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error("Ошибка при обновлении профиля:", err);
      throw err;
    }
  };

  const handleCreateProfile = async (
    firstName: string,
    lastName: string,
    email: string,
    position: string
  ) => {
    try {
      const newProfile = await createUserProfile(firstName, lastName, email, position);
      setProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error("Ошибка при создании профиля:", err);
      throw err;
    }
  };

  const handleAddDepartment = async (name: string) => {
    try {
      const department = await addDepartment(name);
      setStructure((prev) => ({
        ...prev,
        departments: [...prev.departments, department],
      }));
      return department;
    } catch (err) {
      console.error("Ошибка при добавлении департамента:", err);
      throw err;
    }
  };

  const handleRemoveDepartment = async (departmentId: string) => {
    try {
      await removeDepartment(departmentId);
      setStructure((prev) => ({
        ...prev,
        departments: prev.departments.filter((d) => d.id !== departmentId),
        inspections: prev.inspections.filter((i) => i.departmentId !== departmentId),
      }));
    } catch (err) {
      console.error("Ошибка при удалении департамента:", err);
      throw err;
    }
  };

  const handleAddInspection = async (departmentId: string, name: string) => {
    try {
      const inspection = await addInspection(departmentId, name);
      setStructure((prev) => ({
        ...prev,
        inspections: [...prev.inspections, inspection],
      }));
      return inspection;
    } catch (err) {
      console.error("Ошибка при добавлении инспекции:", err);
      throw err;
    }
  };

  const handleRemoveInspection = async (inspectionId: string) => {
    try {
      await removeInspection(inspectionId);
      setStructure((prev) => ({
        ...prev,
        inspections: prev.inspections.filter((i) => i.id !== inspectionId),
      }));
    } catch (err) {
      console.error("Ошибка при удалении инспекции:", err);
      throw err;
    }
  };

  const handleGetInspectionsByDepartment = async (departmentId: string) => {
    try {
      return await getInspectionsByDepartment(departmentId);
    } catch (err) {
      console.error("Ошибка при получении инспекций:", err);
      throw err;
    }
  };

  return {
    profile,
    structure,
    loading,
    error,
    loadData,
    updateProfile: handleUpdateProfile,
    createProfile: handleCreateProfile,
    addDepartment: handleAddDepartment,
    removeDepartment: handleRemoveDepartment,
    addInspection: handleAddInspection,
    removeInspection: handleRemoveInspection,
    getInspectionsByDepartment: handleGetInspectionsByDepartment,
  };
}
