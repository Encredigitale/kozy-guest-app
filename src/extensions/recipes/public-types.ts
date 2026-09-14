/** Types partagés entre les fonctions serveur « Recette » et l'interface. */

export type RecipePhoto = {
  id: string;
  url: string | null;
  sortOrder: number;
};

export type RecipeSummary = {
  id: string;
  menuItemId: string;
  title: string;
  hasText: boolean;
  photoCount: number;
  hasLink: boolean;
  shareCount: number;
  canEdit: boolean;
};

export type RecipeShare = {
  invitationId: string;
  name: string;
  status: string;
};

export type RecipeDetail = {
  id: string;
  eventId: string;
  menuItemId: string;
  title: string;
  textContent: string | null;
  externalUrl: string | null;
  externalUrlNote: string | null;
  photos: RecipePhoto[];
  shares: RecipeShare[];
  canEdit: boolean;
};

export type RecipeCandidate = {
  invitationId: string;
  name: string;
  status: string;
  accepted: boolean;
};
