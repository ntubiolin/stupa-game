#include "TibetRitualEffect.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Pawn.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "ProceduralMeshComponent.h"

namespace
{
const FVector Up = FVector::UpVector;
FVector Radial(double Angle) { return {FMath::Cos(Angle), FMath::Sin(Angle), 0}; }

// Each colour is one mesh section. Thin leaves are wound on both sides so a
// pilgrim looking back at a spell sees the same silhouette.
struct FSurface
{
    TArray<FVector> Points, Normals;
    TArray<int32> Indices;
    void Triangle(FVector A, FVector B, FVector C)
    {
        FVector N = FVector::CrossProduct(B - A, C - A).GetSafeNormal();
        if (N.IsNearlyZero()) return;
        int32 Base = Points.Num();
        Points.Append({A, B, C, A, C, B});
        Normals.Append({N, N, N, -N, -N, -N});
        Indices.Append({Base + 2, Base + 1, Base, Base + 5, Base + 4, Base + 3});
    }
    void Quad(FVector A, FVector B, FVector C, FVector D)
    {
        Triangle(A, B, C);
        Triangle(A, C, D);
    }
    void Stroke(FVector A, FVector B, double Radius)
    {
        const FVector Axis = (B - A).GetSafeNormal();
        FVector U, V;
        Axis.FindBestAxisVectors(U, V);
        FVector Last = U * Radius;
        for (int32 I = 1; I <= 4; ++I)
        {
            const double T = I * UE_HALF_PI;
            const FVector Next = (U * FMath::Cos(T) + V * FMath::Sin(T)) * Radius;
            Quad(A + Last, B + Last, B + Next, A + Next);
            Last = Next;
        }
    }
    void Hoop(FVector Center, FVector X, FVector Y, double Radius, double Thickness,
        double Begin = 0, double End = UE_TWO_PI)
    {
        const int32 Steps = FMath::Max(5, FMath::CeilToInt(36 * (End - Begin) / UE_TWO_PI));
        for (int32 I = 0; I < Steps; ++I)
        {
            const double A = FMath::Lerp(Begin, End, double(I) / Steps);
            const double B = FMath::Lerp(Begin, End, double(I + 1) / Steps);
            const FVector D = X * FMath::Cos(A) + Y * FMath::Sin(A);
            const FVector E = X * FMath::Cos(B) + Y * FMath::Sin(B);
            Quad(Center + D * (Radius - Thickness), Center + D * (Radius + Thickness),
                 Center + E * (Radius + Thickness), Center + E * (Radius - Thickness));
        }
    }
    void Profile(const TArray<FVector2D>& Rings, int32 Sides)
    {
        for (int32 J = 1; J < Rings.Num(); ++J)
        {
            const auto P = Rings[J - 1], Q = Rings[J];
            for (int32 I = 0; I < Sides; ++I)
            {
                const FVector A = Radial(I * UE_TWO_PI / Sides), B = Radial((I + 1) * UE_TWO_PI / Sides);
                Quad(A * P.X + Up * P.Y, B * P.X + Up * P.Y, B * Q.X + Up * Q.Y, A * Q.X + Up * Q.Y);
            }
        }
    }
    // A folded leaf with a raised midrib, narrowing to a single point at each end.
    void Leaf(FVector A, FVector B, FVector HalfWidth, FVector Bend)
    {
        FVector LastLeft = A, LastRight = A, LastSpine = A;
        for (int32 I = 1; I <= 9; ++I)
        {
            const double T = I / 9., Arch = FMath::Sin(UE_PI * T);
            const FVector Mid = FMath::Lerp(A, B, T) + Bend * Arch;
            const FVector Left = Mid - HalfWidth * Arch, Right = Mid + HalfWidth * Arch;
            const FVector Spine = Mid + Bend * (Arch * .23);
            Quad(LastLeft, Left, Spine, LastSpine);
            Quad(LastSpine, Spine, Right, LastRight);
            LastLeft = Left; LastRight = Right; LastSpine = Spine;
        }
    }
    void Install(UProceduralMeshComponent* Mesh, int32 Section, UMaterialInterface* Base, FLinearColor Colour)
    {
        if (Points.IsEmpty()) return;
        Mesh->CreateMeshSection(Section, Points, Indices, Normals, {}, {}, {}, false);
        auto* Ink = Mesh->CreateDynamicMaterialInstance(Section, Base);
        if (Ink) Ink->SetVectorParameterValue(TEXT("Color"), Colour);
    }
};

void Hum(FSurface& Body, FSurface& Rim)
{
    // A pointed comet with two tapered spiral streamers, travelling along local +X.
    Body.Leaf({-88,0,0}, {31,0,0}, {0,23,0}, {0,0,22});
    Body.Leaf({-77,0,0}, {31,0,0}, {0,0,22}, {0,-21,0});
    for (int32 J = 0; J < 2; ++J)
    {
        FVector Last(-110,0,0);
        for (int32 I = 1; I <= 24; ++I)
        {
            const double T = I / 24., A = 8 * T + J * UE_PI, R = 17 * FMath::Sin(T * UE_PI);
            const FVector Next(-110 + 128 * T, R * FMath::Cos(A), R * FMath::Sin(A));
            Rim.Stroke(Last, Next, 1.1 + 1.3 * T);
            Last = Next;
        }
    }
}

void Chant(FSurface& Body, FSurface& Rim)
{
    Body.Hoop(FVector::ZeroVector, FVector::ForwardVector, FVector::RightVector, 124, 2.7);
    Rim.Hoop(FVector::ZeroVector, FVector::ForwardVector, FVector::RightVector, 119, 1);
    for (int32 J = 0; J < 6; ++J)
    {
        const FVector R = Radial(J * UE_TWO_PI / 6), Side = Up ^ R;
        Body.Leaf(R * 55, R * 113, Side * 17, Up * 9);
        Rim.Leaf(R * 115, R * 143 + Up * 8, Side * 6, Up * 6);
    }
}

void Phurba(FSurface& Body, FSurface& Rim)
{
    Body.Profile({{0,-90},{4,-69},{16,13},{8,22},{0,23}}, 3);
    Rim.Profile({{7,15},{19,20},{18,25},{7,29},{9,43},{5,50}}, 10);
    for (int32 I = 0; I < 3; ++I)
    {
        const FVector R = Radial(I * UE_TWO_PI / 3);
        Rim.Leaf(Up * 48, Up * 81, (Up ^ R) * 4, R * 15);
    }
    Body.Profile({{4,46},{6,60},{0,85}}, 8);
}

void Bell(FSurface& Body, FSurface& Rim)
{
    // The flared instrument hangs to one side of the three advancing sound fronts.
    Body.Profile({{0,22},{7,19},{10,9},{12,-8},{15,-19},{26,-31},{27,-35},{21,-35}}, 24);
    Rim.Profile({{5,19},{6,33},{11,38},{5,43},{0,50}}, 12);
    for (int32 I = 0; I < 3; ++I)
    {
        const double R = 58 + 44 * I;
        // Vertical waves read from the player's shoulder even on a bright ground plane.
        Rim.Hoop(FVector(R * .48,0,0), FVector::RightVector, Up, R * .42, 2.4,
                 -.45 * UE_PI, .45 * UE_PI);
        Rim.Hoop(FVector(R * .48,0,0), FVector::RightVector, Up, R * .42, 2.4,
                 .55 * UE_PI, 1.45 * UE_PI);
    }
}

void Lotus(FSurface& Body, FSurface& Rim)
{
    for (int32 I = 0; I < 9; ++I)
    {
        FVector R = Radial(I * UE_TWO_PI / 9), Side = Up ^ R;
        Body.Leaf(R * 26, R * 81 + Up * 69, Side * 19, R * 14);
        R = Radial((I + .5) * UE_TWO_PI / 9);
        Rim.Leaf(R * 30, R * 92 + Up * 38, (Up ^ R) * 15, R * 11);
    }
    Rim.Hoop(Up * 3, FVector::ForwardVector, FVector::RightVector, 34, 2);
}

void Invocation(FSurface& Body, FSurface& Rim)
{
    const FVector Center(0,0,130);
    Rim.Hoop(Center, FVector::RightVector, Up, 72, 3);
    Body.Hoop(Center, FVector::RightVector, Up, 79, 1.8, .13 * UE_PI, .87 * UE_PI);
    for (int32 I = 0; I < 9; ++I)
    {
        const double A = I * UE_PI / 8;
        const FVector R(0, FMath::Cos(A), FMath::Sin(A)), Side(0,-R.Z,R.Y);
        Body.Leaf(Center + R * 71, Center + R * (94 + 7 * (I % 2)), Side * 6, FVector(7,0,0));
    }
}

void Guru(FSurface& Body, FSurface& Rim)
{
    Body.Hoop(FVector::ZeroVector, FVector::ForwardVector, FVector::RightVector, 107, 3.5);
    for (int32 J = 0; J < 8; ++J)
    {
        const FVector R = Radial(J * UE_TWO_PI / 8);
        Rim.Leaf(R * 65, R * 125 + Up * 16, (Up ^ R) * 12, Up * 8);
    }
    for (int32 J = 0; J < 6; ++J)
    {
        const FVector R = Radial(J * UE_TWO_PI / 6);
        Body.Leaf(R * 52 + Up * 6, R * 125 + Up * 191, (Up ^ R) * 15, R * 21);
    }
    for (int32 J = 0; J < 3; ++J)
    {
        FVector Last = Radial(J * UE_TWO_PI / 3) * 93;
        for (int32 I = 1; I <= 28; ++I)
        {
            const double T = I / 28.;
            const FVector Next = Radial(J * UE_TWO_PI / 3 + 5 * T) * (93 - 75 * T) + Up * (T * 308);
            Body.Stroke(Last, Next, 7 - 3 * T);
            Last = Next;
        }
    }
    Rim.Profile({{0,258},{14,289},{6,309},{0,331}}, 6);
}

const FLinearColor Fill[] = {{.004f,.37f,.62f},{.96f,.30f,.015f},{.035f,.055f,.63f},
    {.84f,.36f,.035f},{.72f,.055f,.29f},{.035f,.44f,.23f},{.26f,.022f,.65f}};
const FLinearColor Edge[] = {{.12f,1.05f,1.12f},{1.40f,.81f,.17f},{1.04f,.50f,.08f},
    {1.40f,1.03f,.42f},{1.17f,.36f,.59f},{1.20f,.89f,.35f},{1.05f,.22f,.55f}};

void Impact(FSurface& Body, FSurface& Rim, int32 SourceSlot)
{
    if (SourceSlot == 0)
    {
        // Two broken turquoise ripples, broadside to the incoming seed bolt.
        for (int32 I = 0; I < 3; ++I)
        {
            const double A = I * UE_TWO_PI / 3;
            Body.Hoop(FVector::ZeroVector, FVector::RightVector, Up, 39, 4, A + .12, A + 1.65);
            Rim.Hoop(FVector::ZeroVector, FVector::RightVector, Up, 51, 2, A + .43, A + 1.67);
        }
        return;
    }
    if (SourceSlot == 2)
    {
        // The triangular-faced dagger stamps a three-point seal.
        for (int32 I = 0; I < 3; ++I)
        {
            const double A = I * UE_TWO_PI / 3;
            const FVector R(0,FMath::Sin(A),FMath::Cos(A)), S(0,R.Z,-R.Y);
            Body.Leaf(R * 11, R * 73, S * 9, FVector(-9,0,0));
            Rim.Stroke(R * 33, FVector(0,FMath::Sin(A+UE_TWO_PI/3),FMath::Cos(A+UE_TWO_PI/3)) * 33, 3);
        }
        return;
    }
    for (int32 I = 0; I < 9; ++I)
    {
        const double A = I * UE_TWO_PI / 9;
        const FVector R(0, FMath::Cos(A), FMath::Sin(A)), Side(0,-R.Z,R.Y);
        FSurface& Part = I % 2 ? Rim : Body;
        Part.Leaf(R * 14, R * (49 + (I % 3) * 13), Side * 4, FVector(-7,0,2));
    }
}
}

ATibetRitualEffect::ATibetRitualEffect()
{
    PrimaryActorTick.bCanEverTick = true;
    Motif = CreateDefaultSubobject<UProceduralMeshComponent>(TEXT("Ritual motif"));
    SetRootComponent(Motif);
    Motif->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Motif->SetGenerateOverlapEvents(false);
    Motif->SetCastShadow(false);
    Motif->SetCanEverAffectNavigation(false);
}

void ATibetRitualEffect::Start(int32 SkillSlot, const FVector& From, const FVector& To, APawn* Caster,
    UMaterialInterface* Material)
{
    Slot = SkillSlot; Origin = From; Target = To; Source = Caster;
    Facing = (To - From).GetSafeNormal2D().Rotation();
    const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
    const float Lifetimes[] = {.79f,.90f,1.12f,.90f,6.f,1.65f,1.38f};
    Duration = Lifetimes[Slot];
    FSurface Body, Rim;
    switch (Slot)
    {
    case 0:
        Hum(Body, Rim);
        Origin += Side * 54 + Up * 22;
        BuildBoltTrail(Material);
        break;
    case 1: Chant(Body, Rim); Origin = Caster->GetActorLocation() - Up * 78; break;
    case 2: Phurba(Body, Rim); break;
    case 3: Bell(Body, Rim); Origin += Side * 58; break;
    case 4: Lotus(Body, Rim); break;
    case 5:
    {
        Invocation(Body, Rim);
        Origin = Caster->GetActorLocation() + Side * 139 + Facing.Vector() * 58 - Up * 86;
        auto* Figure = NewObject<UStaticMeshComponent>(this);
        Figure->SetupAttachment(Motif);
        Figure->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,TEXT("/Game/Figures/Tenma.Tenma")));
        Figure->SetRelativeRotation(FRotator(0,90,0));
        Figure->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Figure->SetGenerateOverlapEvents(false);
        Figure->SetCastShadow(false);
        Figure->RegisterComponent();
        break;
    }
    case 6: Guru(Body, Rim); break;
    default: Destroy(); return;
    }
    Body.Install(Motif, 0, Material, Fill[Slot]);
    Rim.Install(Motif, 1, Material, Edge[Slot]);
    SetLifeSpan(Duration);
    Animate();
}

FVector ATibetRitualEffect::BoltPoint(double T) const
{
    const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
    // An unbroken shoulder-high arc stays legible from the normal rear camera.
    const double Arch = FMath::Sin(UE_PI * T);
    return FMath::Lerp(Origin,Target,T) + Side * (117 * Arch) + Up * (87 * Arch);
}

void ATibetRitualEffect::BuildBoltTrail(UMaterialInterface* Material)
{
    BoltTrail = NewObject<UProceduralMeshComponent>(this);
    BoltTrail->SetupAttachment(Motif);
    BoltTrail->SetAbsolute(true,true,true);
    BoltTrail->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    BoltTrail->SetCanEverAffectNavigation(false);
    BoltTrail->SetCastShadow(false);
    BoltTrail->RegisterComponent();
    BoltTrail->SetWorldLocation(Origin);
    auto* Ink = UMaterialInstanceDynamic::Create(Material,this);
    if (Ink) Ink->SetVectorParameterValue(TEXT("Color"), Fill[0]);
    // Reveal the arc behind the moving tip, then withdraw it from the hand.
    for (int32 Part = 0; Part < 8; ++Part)
    {
        FSurface Ribbon;
        for (int32 J = 0; J < 3; ++J)
        {
            const double A = (Part * 3 + J) / 24., B = A + 1. / 24;
            const FVector P = BoltPoint(A) - Origin, Q = BoltPoint(B) - Origin;
            Ribbon.Stroke(P,Q,3.3 + 2.7 * FMath::Sin(UE_PI*A));
            Ribbon.Stroke(P + Up * (10 + 7 * FMath::Sin(A * 13)),
                          Q + Up * (10 + 7 * FMath::Sin(B * 13)),1.75);
        }
        BoltTrail->CreateMeshSection(Part,Ribbon.Points,Ribbon.Indices,Ribbon.Normals,{}, {}, {},false);
        BoltTrail->SetMaterial(Part,Ink);
    }
}

void ATibetRitualEffect::StartImpact(const FVector& Position, const FVector& Outward, int32 SourceSlot, bool bFinal,
    UMaterialInterface* Material)
{
    Slot = 7; Origin = Position; Facing = Outward.GetSafeNormal2D().Rotation();
    bFinisher = bFinal;
    Duration = bFinal ? .62f : .43f;
    FSurface Body, Rim;
    Impact(Body, Rim, SourceSlot);
    Body.Install(Motif, 0, Material, Fill[SourceSlot]);
    Rim.Install(Motif, 1, Material, Edge[SourceSlot]);
    SetLifeSpan(Duration);
    Animate();
}

void ATibetRitualEffect::StartEnemyAttack(AActor& Attacker, bool bStrike, bool bBoss, float Radius,
    float Windup, UMaterialInterface* Material)
{
    SetOwner(&Attacker);
    Slot = bStrike ? EnemyStrike : EnemyWindup;
    Origin = Attacker.GetActorLocation() + Up * 12;
    Facing = FRotator(0, Attacker.GetActorRotation().Yaw - 90, 0);
    Duration = bStrike ? .38f : Windup;
    FSurface Body, Rim;
    if (!bStrike)
    {
        // The border remains at the exact damage radius while the teeth turn inward.
        Body.Hoop(FVector::ZeroVector, FVector::ForwardVector, FVector::RightVector, Radius - 4, 4);
        for (int32 I = 0; I < 8; ++I)
        {
            const FVector R = Radial(I * UE_TWO_PI / 8);
            Rim.Leaf(R * (Radius - 10), R * (Radius - 35), (Up ^ R) * 8, Up * 9);
        }
    }
    else if (bBoss)
    {
        Body.Hoop(Up * 8, FVector::ForwardVector, FVector::RightVector, Radius - 8, 8);
        for (int32 I = 0; I < 12; ++I)
        {
            const FVector R = Radial(I * UE_TWO_PI / 12);
            Rim.Leaf(R * 60, R * Radius + Up * (I % 2 ? 76 : 42), (Up ^ R) * 10, Up * 24);
        }
    }
    else
    {
        // Two raised, tapered claw arcs read above a monster's feet and the terrain.
        for (int32 J = 0; J < 2; ++J)
        {
            FSurface& Arc = J == 0 ? Body : Rim;
            const auto Edge = [Radius, J](int32 Step, double Sign) {
                const double T = Step / 12.;
                return Radial((T - .5) * 2.65) * (Radius - 12 * J) +
                    Up * (48 + 62 * T + 22 * J + Sign * (1 + 9 * FMath::Sin(T * UE_PI)));
            };
            for (int32 I = 0; I < 12; ++I)
                Arc.Quad(Edge(I, -1), Edge(I + 1, -1), Edge(I + 1, 1), Edge(I, 1));
        }
    }
    Body.Install(Motif, 0, Material, FLinearColor(1.65f,.025f,.035f));
    Rim.Install(Motif, 1, Material, FLinearColor(2.f,.47f,.09f));
    if (bStrike) SetLifeSpan(Duration);
    Animate();
}

void ATibetRitualEffect::Tick(float Dt)
{
    Super::Tick(Dt);
    Age += Dt;
    Animate();
}

void ATibetRitualEffect::Animate()
{
    if (Duration <= 0) return;
    const float T = FMath::Clamp(Age / Duration, 0.f, 1.f);
    const float Rise = 1 - FMath::Square(1 - T);
    const float Fade = 1 - FMath::SmoothStep(.74f,1.f,T);
    FVector At = Origin, Scale(1);
    FRotator Rotation = Facing;
    switch (Slot)
    {
    case 0:
    {
        const double Travel = FMath::Min(double(T) / .60, 1.);
        At = BoltPoint(Travel);
        Rotation = (BoltPoint(FMath::Min(Travel+.015,1.)) - BoltPoint(FMath::Max(0.,Travel-.015))).Rotation();
        Scale = FVector(.83 + .27 * Rise, Fade, Fade);
        if (BoltTrail)
            for (int32 Part = 0; Part < 8; ++Part)
                BoltTrail->SetMeshSectionVisible(Part, Part < FMath::CeilToInt(Travel * 8) &&
                    T < .60f + .40f * (Part+1) / 8);
        break;
    }
    case 1:
        Rotation.Yaw += 25 * Rise;
        Scale = FVector(.32 + 1.15 * Rise) * (.55 + .45 * Fade);
        At.Z += 7 * Rise;
        break;
    case 2:
        {
            const float Drop = 1 - FMath::SmoothStep(.09f,.54f,T);
            const FVector Side = FRotationMatrix(Facing).GetUnitAxis(EAxis::Y);
            At = Target + Side * (44 + 64 * Drop) + Up * (52 + 109 * Drop);
            Rotation.Roll = 27 + 16 * Drop;
            Rotation.Pitch = -9;
            Scale = FVector(1.33,1.33,1.22) * (.50 + .50 * Fade);
        }
        break;
    case 3:
        At = FMath::Lerp(Origin, Target, double(.12f + .75f * Rise));
        Rotation.Roll = FMath::Sin(12 * T) * 14;
        Scale = FVector(.80 + .33 * Rise) * (.55 + .45 * Fade);
        break;
    case 4:
        if (Source.IsValid()) At = Source->GetActorLocation() - Up * 76;
        Rotation.Yaw += Age * 21;
        Scale = FVector(.69 + .30 * FMath::Exp(-Age * 2) + .03 * FMath::Sin(Age * 4)) * (.4 + .6 * Fade);
        break;
    case 5:
        At.Z += 12 + 19 * FMath::Sin(T * UE_PI);
        Scale = FVector(.74 + .28 * FMath::Sin(T * UE_PI)) * (.60 + .40 * Fade);
        break;
    case 6:
        At = Target - Up * 109;
        Rotation.Yaw += 80 * Rise;
        Scale = FVector(1.06 + .46 * Rise, 1.06 + .46 * Rise, 1.02 + .38 * Rise) * (.45 + .55 * Fade);
        break;
    case EnemyWindup:
        Rotation.Yaw += 30 * Rise;
        Scale.Z = .5 + 2 * T;
        break;
    case EnemyStrike:
        Scale = FVector(.55 + .45 * Rise, .55 + .45 * Rise, (.65 + .35 * Rise) * Fade);
        Rotation.Yaw += 38 * (Rise - .5);
        At.Z += 8 * Rise;
        break;
    case 7:
        Scale = FVector((bFinisher ? 1.35 : 1.) * (.35 + 1.08 * Rise) * (.35 + .65 * Fade));
        Rotation.Roll = 12 * Rise;
        break;
    }
    SetActorLocationAndRotation(At, Rotation);
    SetActorScale3D(Scale);
}
