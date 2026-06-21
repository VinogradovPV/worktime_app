import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Department {
  id: string;
  name: string;
}

export interface Inspection {
  id: string;
  departmentId: string;
  name: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  inspectionId?: string;
  inspectionName?: string;
  position: string;
  language: "ru" | "en";
  theme: "light" | "dark" | "auto";
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationStructure {
  departments: Department[];
  inspections: Inspection[];
}

const USER_PROFILE_KEY = "worktime_user_profile";
const ORG_STRUCTURE_KEY = "worktime_org_structure";

// Получить профиль пользователя
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const profile = await AsyncStorage.getItem(USER_PROFILE_KEY);
    if (profile) {
      return JSON.parse(profile);
    }
    return null;
  } catch (error) {
    console.error("Ошибка при получении профиля пользователя:", error);
    return null;
  }
}

// Сохранить профиль пользователя
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    profile.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Ошибка при сохранении профиля пользователя:", error);
    throw error;
  }
}

// Создать новый профиль пользователя
export async function createUserProfile(
  firstName: string,
  lastName: string,
  email: string,
  position: string
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: Date.now().toString(),
    firstName,
    lastName,
    email,
    position,
    language: "ru",
    theme: "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveUserProfile(profile);
  return profile;
}

// Обновить профиль пользователя
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const profile = await getUserProfile();
  if (!profile) {
    throw new Error("Профиль пользователя не найден");
  }

  const updated = { ...profile, ...updates };
  await saveUserProfile(updated);
  return updated;
}

// Получить структуру организации
export async function getOrganizationStructure(): Promise<OrganizationStructure> {
  try {
    const structure = await AsyncStorage.getItem(ORG_STRUCTURE_KEY);
    if (structure) {
      return JSON.parse(structure);
    }
    // Возвращаем пустую структуру по умолчанию
    return { departments: [], inspections: [] };
  } catch (error) {
    console.error("Ошибка при получении структуры организации:", error);
    return { departments: [], inspections: [] };
  }
}

// Сохранить структуру организации
export async function saveOrganizationStructure(structure: OrganizationStructure): Promise<void> {
  try {
    await AsyncStorage.setItem(ORG_STRUCTURE_KEY, JSON.stringify(structure));
  } catch (error) {
    console.error("Ошибка при сохранении структуры организации:", error);
    throw error;
  }
}

// Добавить департамент
export async function addDepartment(name: string): Promise<Department> {
  const structure = await getOrganizationStructure();
  const department: Department = {
    id: Date.now().toString(),
    name,
  };

  structure.departments.push(department);
  await saveOrganizationStructure(structure);
  return department;
}

// Удалить департамент
export async function removeDepartment(departmentId: string): Promise<void> {
  const structure = await getOrganizationStructure();
  structure.departments = structure.departments.filter((d) => d.id !== departmentId);
  structure.inspections = structure.inspections.filter((i) => i.departmentId !== departmentId);
  await saveOrganizationStructure(structure);
}

// Добавить инспекцию/отдел
export async function addInspection(departmentId: string, name: string): Promise<Inspection> {
  const structure = await getOrganizationStructure();
  const inspection: Inspection = {
    id: Date.now().toString(),
    departmentId,
    name,
  };

  structure.inspections.push(inspection);
  await saveOrganizationStructure(structure);
  return inspection;
}

// Удалить инспекцию/отдел
export async function removeInspection(inspectionId: string): Promise<void> {
  const structure = await getOrganizationStructure();
  structure.inspections = structure.inspections.filter((i) => i.id !== inspectionId);
  await saveOrganizationStructure(structure);
}

// Получить инспекции по департаменту
export async function getInspectionsByDepartment(departmentId: string): Promise<Inspection[]> {
  const structure = await getOrganizationStructure();
  return structure.inspections.filter((i) => i.departmentId === departmentId);
}

// Получить название департамента по ID
export async function getDepartmentName(departmentId: string): Promise<string | null> {
  const structure = await getOrganizationStructure();
  const department = structure.departments.find((d) => d.id === departmentId);
  return department?.name || null;
}

// Получить название инспекции по ID
export async function getInspectionName(inspectionId: string): Promise<string | null> {
  const structure = await getOrganizationStructure();
  const inspection = structure.inspections.find((i) => i.id === inspectionId);
  return inspection?.name || null;
}
