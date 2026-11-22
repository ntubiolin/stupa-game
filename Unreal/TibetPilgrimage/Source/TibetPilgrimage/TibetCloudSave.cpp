#include "TibetCloudSave.h"
#include "TibetGameMode.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Engine/Texture2D.h"
#include "ImageUtils.h"
#include "Misc/CommandLine.h"
#include "Misc/ConfigCacheIni.h"
#include "Misc/DateTime.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "TextureResource.h"

namespace
{
const TCHAR* CloudSection = TEXT("TibetCloud");

TSharedPtr<FJsonObject> ExtractUnrealSection(const TSharedPtr<FJsonObject>& Root)
{
    if (!Root.IsValid()) return nullptr;
    if (Root->HasTypedField<EJson::Object>(TEXT("saveData")))
    {
        if (auto Inner = ExtractUnrealSection(Root->GetObjectField(TEXT("saveData")))) return Inner;
    }
    if (Root->HasTypedField<EJson::Object>(TEXT("sections")))
    {
        const auto Sections = Root->GetObjectField(TEXT("sections"));
        if (Sections->HasTypedField<EJson::Object>(TEXT("tibetUnreal")))
            return Sections->GetObjectField(TEXT("tibetUnreal"));
    }
    if (Root->HasField(TEXT("map")) || Root->HasField(TEXT("steps"))) return Root;
    return nullptr;
}
}

namespace TibetCloudSave
{
FString ToJson(const UTibetSave& Save)
{
    auto UnrealObj = MakeShared<FJsonObject>();
    UnrealObj->SetStringField(TEXT("map"), Save.Map);
    UnrealObj->SetBoolField(TEXT("bEnglish"), Save.bEnglish);
    UnrealObj->SetBoolField(TEXT("bReturnFromTerma"), Save.bReturnFromTerma);
    UnrealObj->SetBoolField(TEXT("bEpilogue"), Save.bEpilogue);
    UnrealObj->SetBoolField(TEXT("bComplete"), Save.bComplete);
    UnrealObj->SetNumberField(TEXT("equipment"), Save.Equipment);
    UnrealObj->SetNumberField(TEXT("pillCharges"), Save.PillCharges);
    UnrealObj->SetBoolField(TEXT("bQuickMap"), Save.bQuickMap);
    UnrealObj->SetNumberField(TEXT("solarPhase"), Save.SolarPhase);
    UnrealObj->SetNumberField(TEXT("clockRate"), Save.ClockRate);
    UnrealObj->SetNumberField(TEXT("butterLampMask"), Save.ButterLampMask);
    UnrealObj->SetBoolField(TEXT("bUsesDistinctLamps"), Save.bUsesDistinctLamps);
    UnrealObj->SetNumberField(TEXT("monkeysFed"), Save.MonkeysFed);
    UnrealObj->SetNumberField(TEXT("feedingBest"), Save.FeedingBest);
    UnrealObj->SetNumberField(TEXT("feedingPlays"), Save.FeedingPlays);
    UnrealObj->SetBoolField(TEXT("bMessengerJoined"), Save.bMessengerJoined);

    auto StepsObj = MakeShared<FJsonObject>();
    for (const auto& Pair : Save.Steps) StepsObj->SetNumberField(Pair.Key, Pair.Value);
    UnrealObj->SetObjectField(TEXT("steps"), StepsObj);

    auto CountsObj = MakeShared<FJsonObject>();
    for (const auto& Pair : Save.Counts) CountsObj->SetNumberField(Pair.Key, Pair.Value);
    UnrealObj->SetObjectField(TEXT("counts"), CountsObj);

    TArray<TSharedPtr<FJsonValue>> DedArr;
    for (const auto& D : Save.Dedications)
    {
        auto Item = MakeShared<FJsonObject>();
        Item->SetStringField(TEXT("pilgrim"), D.Pilgrim);
        Item->SetStringField(TEXT("prayer"), D.Prayer);
        DedArr.Add(MakeShared<FJsonValueObject>(Item));
    }
    UnrealObj->SetArrayField(TEXT("dedications"), DedArr);

    auto Sections = MakeShared<FJsonObject>();
    Sections->SetObjectField(TEXT("tibetUnreal"), UnrealObj);

    auto Envelope = MakeShared<FJsonObject>();
    Envelope->SetNumberField(TEXT("version"), 2);
    Envelope->SetNumberField(TEXT("savedAt"), double(FDateTime::UtcNow().ToUnixTimestamp()) * 1000.0);
    Envelope->SetObjectField(TEXT("sections"), Sections);

    FString Out;
    auto Writer = TJsonWriterFactory<>::Create(&Out);
    FJsonSerializer::Serialize(Envelope, Writer);
    return Out;
}

bool FromJson(const FString& JsonString, UTibetSave& OutSave)
{
    TSharedPtr<FJsonObject> Root;
    auto Reader = TJsonReaderFactory<>::Create(JsonString);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid()) return false;
    const auto Obj = ExtractUnrealSection(Root);
    if (!Obj.IsValid()) return false;

    OutSave.Steps.Reset();
    OutSave.Counts.Reset();
    OutSave.Dedications.Reset();

    Obj->TryGetStringField(TEXT("map"), OutSave.Map);
    Obj->TryGetBoolField(TEXT("bEnglish"), OutSave.bEnglish);
    Obj->TryGetBoolField(TEXT("bReturnFromTerma"), OutSave.bReturnFromTerma);
    Obj->TryGetBoolField(TEXT("bEpilogue"), OutSave.bEpilogue);
    Obj->TryGetBoolField(TEXT("bComplete"), OutSave.bComplete);
    Obj->TryGetNumberField(TEXT("equipment"), OutSave.Equipment);
    Obj->TryGetNumberField(TEXT("pillCharges"), OutSave.PillCharges);
    Obj->TryGetBoolField(TEXT("bQuickMap"), OutSave.bQuickMap);
    double Solar = OutSave.SolarPhase;
    if (Obj->TryGetNumberField(TEXT("solarPhase"), Solar)) OutSave.SolarPhase = float(Solar);
    Obj->TryGetNumberField(TEXT("clockRate"), OutSave.ClockRate);
    int32 Mask = 0;
    if (Obj->TryGetNumberField(TEXT("butterLampMask"), Mask)) OutSave.ButterLampMask = uint8(FMath::Clamp(Mask, 0, 255));
    Obj->TryGetBoolField(TEXT("bUsesDistinctLamps"), OutSave.bUsesDistinctLamps);
    Obj->TryGetNumberField(TEXT("monkeysFed"), OutSave.MonkeysFed);
    Obj->TryGetNumberField(TEXT("feedingBest"), OutSave.FeedingBest);
    Obj->TryGetNumberField(TEXT("feedingPlays"), OutSave.FeedingPlays);
    Obj->TryGetBoolField(TEXT("bMessengerJoined"), OutSave.bMessengerJoined);

    if (Obj->HasTypedField<EJson::Object>(TEXT("steps")))
    {
        for (const auto& Pair : Obj->GetObjectField(TEXT("steps"))->Values)
        {
            int32 Val = 0;
            if (Pair.Value.IsValid() && Pair.Value->TryGetNumber(Val)) OutSave.Steps.Add(FString(*Pair.Key), Val);
        }
    }
    if (Obj->HasTypedField<EJson::Object>(TEXT("counts")))
    {
        for (const auto& Pair : Obj->GetObjectField(TEXT("counts"))->Values)
        {
            int32 Val = 0;
            if (Pair.Value.IsValid() && Pair.Value->TryGetNumber(Val)) OutSave.Counts.Add(FString(*Pair.Key), Val);
        }
    }
    const TArray<TSharedPtr<FJsonValue>>* DedArr = nullptr;
    if (Obj->TryGetArrayField(TEXT("dedications"), DedArr) && DedArr)
    {
        for (const auto& Entry : *DedArr)
        {
            const TSharedPtr<FJsonObject>* Item = nullptr;
            if (Entry.IsValid() && Entry->TryGetObject(Item) && Item && Item->IsValid())
            {
                FTibetDedication D;
                (*Item)->TryGetStringField(TEXT("pilgrim"), D.Pilgrim);
                (*Item)->TryGetStringField(TEXT("prayer"), D.Prayer);
                if (!D.Pilgrim.IsEmpty() || !D.Prayer.IsEmpty()) OutSave.Dedications.Add(MoveTemp(D));
            }
        }
    }
    if (OutSave.Map.IsEmpty()) OutSave.Map = TEXT("stupa");
    OutSave.PillCharges = FMath::Clamp(OutSave.PillCharges, 0, 4);
    return true;
}

bool ExportBackup(const UTibetSave& Save, FString& OutPath)
{
    OutPath = FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir() / TEXT("SaveBackups/TibetPilgrimage-Backup.json"));
    return FFileHelper::SaveStringToFile(ToJson(Save), *OutPath, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM);
}

bool ImportBackup(UTibetSave& OutSave, FString& OutPath)
{
    OutPath = FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir() / TEXT("SaveBackups/TibetPilgrimage-Backup.json"));
    FString Json;
    if (!FFileHelper::LoadFileToString(Json, *OutPath)) return false;
    return FromJson(Json, OutSave);
}

bool ExportTexturePng(UTexture2D* Texture, const FString& FileName, FString& OutPath)
{
    if (!Texture || !Texture->GetPlatformData() || Texture->GetPlatformData()->Mips.IsEmpty()) return false;
    FTexture2DMipMap& Mip = Texture->GetPlatformData()->Mips[0];
    const int32 Width = Mip.SizeX;
    const int32 Height = Mip.SizeY;
    if (Width <= 0 || Height <= 0) return false;
    const void* Raw = Mip.BulkData.LockReadOnly();
    if (!Raw)
    {
        Mip.BulkData.Unlock();
        return false;
    }
    const int64 ExpectedBytes = int64(Width) * int64(Height) * int64(sizeof(FColor));
    if (Mip.BulkData.GetBulkDataSize() < ExpectedBytes)
    {
        Mip.BulkData.Unlock();
        return false;
    }
    TArray64<uint8> CompressedPng;
    const FColor* Pixels = static_cast<const FColor*>(Raw);
    TArray<FColor> ColorCopy(Pixels, Width * Height);
    Mip.BulkData.Unlock();
    for (FColor& C : ColorCopy) C.A = 255;
    FImageUtils::PNGCompressImageArray(Width, Height, ColorCopy, CompressedPng);
    if (CompressedPng.IsEmpty()) return false;
    OutPath = FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir() / TEXT("Keepsakes") / FileName);
    return FFileHelper::SaveArrayToFile(CompressedPng, *OutPath);
}

FString ServerUrl()
{
    FString Url;
    if (FParse::Value(FCommandLine::Get(), TEXT("TibetServerURL="), Url) && !Url.IsEmpty())
    {
        Url.RemoveFromEnd(TEXT("/"));
        return Url;
    }
    if (GConfig && !GGameUserSettingsIni.IsEmpty())
        GConfig->GetString(CloudSection, TEXT("ServerURL"), Url, GGameUserSettingsIni);
    Url.TrimStartAndEndInline();
    Url.RemoveFromEnd(TEXT("/"));
    return Url.IsEmpty() ? FString(TEXT("http://127.0.0.1:8787")) : Url;
}

FString SessionToken()
{
    FString Token;
    if (GConfig && !GGameUserSettingsIni.IsEmpty())
        GConfig->GetString(CloudSection, TEXT("SessionToken"), Token, GGameUserSettingsIni);
    return Token.TrimStartAndEnd();
}

FString SignedInLabel()
{
    if (SessionToken().IsEmpty()) return {};
    FString Email, Name;
    if (GConfig && !GGameUserSettingsIni.IsEmpty())
    {
        GConfig->GetString(CloudSection, TEXT("UserEmail"), Email, GGameUserSettingsIni);
        GConfig->GetString(CloudSection, TEXT("UserName"), Name, GGameUserSettingsIni);
    }
    if (!Name.IsEmpty() && !Email.IsEmpty()) return FString::Printf(TEXT("%s (%s)"), *Name, *Email);
    return !Email.IsEmpty() ? Email : Name;
}

void SaveSession(const FString& Token, const FString& Email, const FString& Name)
{
    if (!GConfig || GGameUserSettingsIni.IsEmpty()) return;
    GConfig->SetString(CloudSection, TEXT("SessionToken"), *Token, GGameUserSettingsIni);
    GConfig->SetString(CloudSection, TEXT("UserEmail"), *Email, GGameUserSettingsIni);
    GConfig->SetString(CloudSection, TEXT("UserName"), *Name, GGameUserSettingsIni);
    GConfig->Flush(false, GGameUserSettingsIni);
}

void ClearSession()
{
    SaveSession(TEXT(""), TEXT(""), TEXT(""));
}
}
