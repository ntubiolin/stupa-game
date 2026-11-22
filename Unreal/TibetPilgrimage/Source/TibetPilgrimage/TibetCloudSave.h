#pragma once

#include "CoreMinimal.h"

class UTibetSave;
class UTexture2D;

namespace TibetCloudSave
{
TIBETPILGRIMAGE_API FString ToJson(const UTibetSave& Save);
TIBETPILGRIMAGE_API bool FromJson(const FString& JsonString, UTibetSave& OutSave);
TIBETPILGRIMAGE_API bool ExportBackup(const UTibetSave& Save, FString& OutPath);
TIBETPILGRIMAGE_API bool ImportBackup(UTibetSave& OutSave, FString& OutPath);
TIBETPILGRIMAGE_API bool ExportTexturePng(UTexture2D* Texture, const FString& FileName, FString& OutPath);

TIBETPILGRIMAGE_API FString ServerUrl();
TIBETPILGRIMAGE_API FString SessionToken();
TIBETPILGRIMAGE_API FString SignedInLabel();
TIBETPILGRIMAGE_API void SaveSession(const FString& Token, const FString& Email, const FString& Name);
TIBETPILGRIMAGE_API void ClearSession();
}
